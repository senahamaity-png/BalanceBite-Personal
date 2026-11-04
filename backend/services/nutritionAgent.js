
const crypto = require("crypto");
const Food = require("../models/Food");
const FoodLog = require("../models/FoodLog");
const NutritionGoal = require("../models/NutritionGoal");
const PendingAction = require("../models/PendingAction");

const MODEL = "openai/gpt-4o-mini";
const VALID_MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "fiber",
  "sugar",
  "calcium",
  "iron",
];

const CONFIRMATION_TTL_MS = 10 * 60 * 1000;

// India date (YYYY-MM-DD)
function getTodayKey() {
  return new Date(Date.now() + 330 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

// Confirmation security
function getSigningSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured securely.");
  }

  return secret;
}

function signConfirmation(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyConfirmation(token, userId) {
  if (typeof token !== "string" || token.length > 3000) {
    throw new Error("Invalid confirmation token. Please ask the agent again.");
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new Error("Invalid confirmation token.");
  }

  const [encoded, suppliedSignature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest();

  const suppliedBuffer = Buffer.from(suppliedSignature, "base64url");

  if (
    suppliedBuffer.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedSignature)
  ) {
    throw new Error("Confirmation signature is invalid.");
  }

  let payload;

  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );
  } catch {
    throw new Error("Invalid confirmation payload.");
  }

  if (payload.userId !== String(userId)) {
    throw new Error("This confirmation belongs to another user.");
  }

  if (
    typeof payload.nonce !== "string" ||
    !Number.isFinite(payload.expiresAt) ||
    Date.now() >= payload.expiresAt
  ) {
    throw new Error("Confirmation expired. Please ask the agent again.");
  }

  return payload;
}

function hashConfirmationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Scale nutrients according to quantity
function scaleNutrients(nutrients, quantity) {
  const result = {};

  for (const key of NUTRIENT_KEYS) {
    result[key] =
      Math.round(
        (Number(nutrients?.[key] || 0) * quantity / 100) * 100
      ) / 100;
  }

  return result;
}

// Detect explicit food diary update requests
function hasExplicitAddIntent(message) {
  return /\b(add|log|record|track|save|put|include)\b/i.test(message);
}

// Detect whether the request appears to contain all required details
function hasCompleteAddDetails(message) {
  const hasQuantity = /\b\d+(?:\.\d+)?\s*(?:g|gram|grams)\b/i.test(message);
  const hasMeal = /\b(breakfast|lunch|dinner|snacks?)\b/i.test(message);

  return hasExplicitAddIntent(message) && hasQuantity && hasMeal;
}

// AI tools
const tools = [
  {
    type: "function",
    function: {
      name: "get_today_nutrition",
      description:
        "Read the authenticated user's food diary and calculate nutrient totals for a date. Defaults to today in India.",
      parameters: {
        type: "object",
        properties: {
          dateKey: {
            type: "string",
            description: "Optional date in YYYY-MM-DD format.",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nutrition_goals",
      description:
        "Read the authenticated user's saved daily nutrition goals.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_foods",
      description:
        "Search active foods in the database. Return actual stored nutrient values per 100 grams.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Food name or food category to search.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_food_diary_add",
      description:
        "Prepare a food diary addition for confirmation. This tool NEVER writes to the food diary. Use only when the user explicitly requests a diary addition and all required details are known.",
      parameters: {
        type: "object",
        properties: {
          foodName: { type: "string" },
          quantityGrams: { type: "number" },
          mealType: {
            type: "string",
            enum: VALID_MEALS,
          },
        },
        required: ["foodName", "quantityGrams", "mealType"],
        additionalProperties: false,
      },
    },
  },
];

// Execute tools
async function executeTool(name, args, userId, originalMessage) {
  // 1. Today's nutrition
  if (name === "get_today_nutrition") {
    const dateKey = args.dateKey || getTodayKey();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return { error: "Invalid date. Use YYYY-MM-DD." };
    }

    const entries = await FoodLog.find({
      user: userId,
      dateKey,
    })
      .populate("food", "name category servingSize")
      .lean();

    const totals = Object.fromEntries(
      NUTRIENT_KEYS.map((key) => [key, 0])
    );

    for (const entry of entries) {
      for (const key of NUTRIENT_KEYS) {
        totals[key] += Number(entry.nutrients?.[key] || 0);
      }
    }

    for (const key of NUTRIENT_KEYS) {
      totals[key] = Math.round(totals[key] * 100) / 100;
    }

    return {
      dateKey,
      entryCount: entries.length,
      totals,
      entries: entries.map((entry) => ({
        foodName: entry.food?.name || "Unknown food",
        mealType: entry.mealType,
        quantityGrams: entry.quantityGrams,
        nutrients: entry.nutrients,
      })),
    };
  }

  // 2. Nutrition goals
  if (name === "get_nutrition_goals") {
    const goals = await NutritionGoal.findOne({
      user: userId,
    }).lean();

    return {
      goals: goals
        ? {
            calories: goals.calories,
            protein: goals.protein,
            carbohydrates: goals.carbohydrates,
            fat: goals.fat,
            fiber: goals.fiber,
          }
        : {
            calories: 2000,
            protein: 50,
            carbohydrates: 275,
            fat: 65,
            fiber: 28,
          },
      note: goals
        ? "These are the user's stored goals."
        : "These are default goals; the user has not saved personal goals.",
    };
  }

  
  // 3. Smart Food Search
  if (name === "search_foods") {
    const query = String(args.query || "").trim();

    if (!query || query.length > 100) {
      return { error: "Enter a valid food search query." };
    }

    const normalizedQuery = query.toLowerCase();

    // Detect the nutrient requested by the user.
    const nutrientRules = [
      {
        key: "protein",
        pattern: /protein|high-protein|protein-rich/i,
      },
      {
        key: "fiber",
        pattern: /fiber|fibre|high-fiber|high-fibre/i,
      },
      {
        key: "calories",
        pattern: /calorie|calories|low-calorie/i,
      },
      {
        key: "calcium",
        pattern: /calcium/i,
      },
      {
        key: "iron",
        pattern: /iron/i,
      },
      {
        key: "fat",
        pattern: /fat|fatty/i,
      },
      {
        key: "sugar",
        pattern: /sugar/i,
      },
      {
        key: "carbohydrates",
        pattern: /carbohydrate|carbs/i,
      },
    ];

    const nutrientRule = nutrientRules.find((rule) =>
      rule.pattern.test(normalizedQuery)
    );

    const isLowRequest =
      /\blow\b|\bless\b|\bleast\b|\bminimum\b|\breduced\b/i.test(
        normalizedQuery
      );

    // For nutrition queries, search actual database nutrient values.
    if (nutrientRule) {
      const foods = await Food.find({
        isActive: true,
      })
        .select("name category description servingSize nutrients")
        .lean();

      const nutrientKey = nutrientRule.key;

      foods.sort((a, b) => {
        const valueA = Number(a.nutrients?.[nutrientKey] || 0);
        const valueB = Number(b.nutrients?.[nutrientKey] || 0);

        return isLowRequest
          ? valueA - valueB
          : valueB - valueA;
      });

      const results = foods.slice(0, 8).map((food) => ({
        id: String(food._id),
        name: food.name,
        category: food.category,
        description: food.description,
        servingSize: food.servingSize,
        nutrientsPer100g: food.nutrients,
        matchedNutrient: nutrientKey,
        matchedValue: Number(food.nutrients?.[nutrientKey] || 0),
      }));

      return {
        count: results.length,
        searchType: "nutrition",
        sortedBy: nutrientKey,
        order: isLowRequest ? "ascending" : "descending",
        unit: nutrientKey === "calories" ? "kcal/100g" : "g or mg per 100g",
        foods: results,
      };
    }

    // Normal food name/category search.
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const foods = await Food.find({
      isActive: true,
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
      ],
    })
      .select("name category description servingSize nutrients")
      .limit(8)
      .lean();

    return {
      count: foods.length,
      searchType: "name-or-category",
      foods: foods.map((food) => ({
        id: String(food._id),
        name: food.name,
        category: food.category,
        description: food.description,
        servingSize: food.servingSize,
        nutrientsPer100g: food.nutrients,
      })),
    };
  }


  // 4. Prepare food diary addition (NO FOOD DIARY WRITE)
  if (name === "prepare_food_diary_add") {
    if (!hasExplicitAddIntent(originalMessage)) {
      return {
        prepared: false,
        message: "The user has not explicitly requested a diary update.",
      };
    }

    const quantity = Number(args.quantityGrams);
    const foodName = String(args.foodName || "").trim();
    const mealType = args.mealType;

    if (!foodName || foodName.length > 100) {
      return {
        prepared: false,
        message: "Please provide a valid food name.",
      };
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 5000) {
      return {
        prepared: false,
        message: "Quantity must be between 1 and 5000 grams.",
      };
    }

    if (!VALID_MEALS.includes(mealType)) {
      return {
        prepared: false,
        message: "Please provide a valid meal type.",
      };
    }

    const escaped = foodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const food = await Food.findOne({
      isActive: true,
      name: {
        $regex: `^${escaped}$`,
        $options: "i",
      },
    })
      .select("name")
      .lean();

    if (!food) {
      return {
        prepared: false,
        message: "That exact food was not found. Search the food database first.",
      };
    }

    const expiresAt = Date.now() + CONFIRMATION_TTL_MS;
    const nonce = crypto.randomUUID();

    const confirmationToken = signConfirmation({
      userId: String(userId),
      expiresAt,
      nonce,
    });

    const tokenHash = hashConfirmationToken(confirmationToken);

    // Store only the token hash, never the original token.
    await PendingAction.create({
      user: userId,
      tokenHash,
      food: food._id,
      foodName: food.name,
      quantityGrams: quantity,
      mealType,
      expiresAt: new Date(expiresAt),
      status: "pending",
    });

    return {
      prepared: true,
      pendingAction: {
        foodId: String(food._id),
        foodName: food.name,
        quantityGrams: quantity,
        mealType,
        confirmationToken,
      },
      message:
        "The diary addition is ready for the user's confirmation. Nothing has been saved yet.",
    };
  }

  return { error: "Unknown tool." };
}

// Main AI Agent
async function runNutritionAgent(message, userId) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing from backend .env");
  }

  const systemPrompt = `
You are BalanceBite's Agentic AI Nutrition Assistant.

You are connected to:
- The real food database
- The authenticated user's food diary
- The user's nutrition goals

IMPORTANT RULES:

1. For questions about today's nutrition progress:
   Call get_today_nutrition and get_nutrition_goals.

2. For food searches:
   Call search_foods and use actual database results.

3. Never invent food names or nutrient values from the database.

4. Use prepare_food_diary_add only when the user explicitly asks
   to add, log, record, track, or save food.

5. If food name, quantity, or meal type is missing,
   ask the user for the missing information.

6. Never claim that food was saved before confirmation.

7. A prepared diary update is only a proposal.
   The user must click Confirm Add.

8. If a tool returns an error, explain the error honestly.

9. Use metric quantities.

10. Give clear, friendly, concise answers.

11. Nutrition information is general guidance,
    not a medical diagnosis.

12. Do not repeatedly call the same tool without a reason.
`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  let pendingAction = null;

  for (let round = 0; round < 5; round++) {
    const forceDiaryTool =
      round === 0 && hasCompleteAddDetails(message);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "BalanceBite Agentic Nutrition Assistant",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools,
          tool_choice: forceDiaryTool
            ? {
                type: "function",
                function: { name: "prepare_food_diary_add" },
              }
            : "auto",
          temperature: 0.2,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);
      throw new Error("AI provider request failed.");
    }

    const assistantMessage = data.choices?.[0]?.message;

    if (!assistantMessage) {
      throw new Error("AI provider returned an empty response.");
    }

    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls || [];

    if (toolCalls.length === 0) {
      return {
        reply: assistantMessage.content || "I could not generate a response.",
        pendingAction,
      };
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue;

      const name = toolCall.function.name;
      let result;

      try {
        const args = JSON.parse(toolCall.function.arguments || "{}");

        result = await executeTool(name, args, userId, message);

        if (result.pendingAction) {
          pendingAction = result.pendingAction;

          return {
            reply:
              `I found ${pendingAction.foodName}. ` +
              `${pendingAction.quantityGrams}g has been prepared ` +
              `for your ${pendingAction.mealType}. ` +
              "Please review the details and click Confirm Add. " +
              "Nothing has been saved yet.",
            pendingAction,
          };
        }
      } catch (error) {
        console.error(`Tool ${name} failed:`, error.message);

        result = {
          error: "Tool execution failed. Do not claim the action succeeded.",
        };
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: "I could not complete that request. Please try asking in a simpler way.",
    pendingAction,
  };
}

// Confirm and save food diary entry

async function confirmAddFoodToDiary({ confirmationToken }, userId) {
  verifyConfirmation(confirmationToken, userId);

  const tokenHash = hashConfirmationToken(confirmationToken);

  // Atomic claim: only one request can claim this action.
  const pending = await PendingAction.findOneAndUpdate(
    {
      user: userId,
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { status: "processing" },
    },
    { new: true }
  );

  if (!pending) {
    throw new Error(
      "This confirmation is expired, cancelled, already used, or invalid."
    );
  }

  try {
    // Check whether this action has already created a diary entry.
    const existingEntry = await FoodLog.findOne({
      pendingAction: pending._id,
      user: userId,
    }).lean();

    if (existingEntry) {
      await PendingAction.updateOne(
        { _id: pending._id, user: userId },
        {
          $set: {
            status: "confirmed",
            confirmedAt: new Date(),
          },
        }
      );

      return {
        message: "This diary action has already been completed.",
        verified: true,
        entryId: String(existingEntry._id),
        dateKey: existingEntry.dateKey,
        nutrients: existingEntry.nutrients,
      };
    }

    const food = await Food.findOne({
      _id: pending.food,
      isActive: true,
    });

    if (!food) {
      throw new Error("The selected food is no longer available.");
    }

    const nutrients = scaleNutrients(
      food.nutrients,
      pending.quantityGrams
    );

    // IMPORTANT: pendingAction links this log to its one-time action.
    const entry = await FoodLog.create({
      user: userId,
      food: food._id,
      pendingAction: pending._id,
      mealType: pending.mealType,
      quantityGrams: pending.quantityGrams,
      dateKey: getTodayKey(),
      nutrients,
    });

    const verified = await FoodLog.findOne({
      _id: entry._id,
      user: userId,
      pendingAction: pending._id,
    }).lean();

    if (!verified) {
      throw new Error("Diary update could not be verified.");
    }

    await PendingAction.updateOne(
      { _id: pending._id, user: userId },
      {
        $set: {
          status: "confirmed",
          confirmedAt: new Date(),
        },
      }
    );

    return {
      message:
        `${food.name} (${pending.quantityGrams}g) was added to your ${pending.mealType} diary.`,
      verified: true,
      entryId: String(verified._id),
      dateKey: verified.dateKey,
      nutrients: verified.nutrients,
    };
  } catch (error) {
    // If the log was saved but a later operation failed,
    // do not allow the same action to create another log.
    const savedEntry = await FoodLog.findOne({
      pendingAction: pending._id,
      user: userId,
    }).lean();

    if (savedEntry) {
      await PendingAction.updateOne(
        { _id: pending._id, user: userId },
        {
          $set: {
            status: "confirmed",
            confirmedAt: new Date(),
          },
        }
      );

      return {
        message: "This diary action has already been completed.",
        verified: true,
        entryId: String(savedEntry._id),
        dateKey: savedEntry.dateKey,
        nutrients: savedEntry.nutrients,
      };
    }

    await PendingAction.updateOne(
      { _id: pending._id, user: userId, status: "processing" },
      { $set: { status: "pending" } }
    );

    throw error;
  }
}

// Cancel a pending diary action
async function cancelFoodDiaryAction({ confirmationToken }, userId) {
  if (typeof confirmationToken !== "string" || !confirmationToken.trim()) {
    throw new Error("A valid confirmation token is required.");
  }

  verifyConfirmation(confirmationToken, userId);

  const tokenHash = hashConfirmationToken(confirmationToken);

  const cancelled = await PendingAction.findOneAndUpdate(
    {
      user: userId,
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    },
    { new: true }
  );

  if (!cancelled) {
    throw new Error(
      "This action is expired, already used, cancelled, or invalid."
    );
  }

  return {
    success: true,
    message: "The proposed diary update was cancelled. Nothing was added.",
  };
}

module.exports = {
  runNutritionAgent,
  confirmAddFoodToDiary,
  cancelFoodDiaryAction,
};
