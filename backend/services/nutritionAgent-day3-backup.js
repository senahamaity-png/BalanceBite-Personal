
const crypto = require("crypto");
const Food = require("../models/Food");
const FoodLog = require("../models/FoodLog");
const NutritionGoal = require("../models/NutritionGoal");

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

// India date (YYYY-MM-DD)
function getTodayKey() {
  return new Date(Date.now() + 330 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

// Confirmation security
function getSigningSecret() {
  const secret = process.env.JWT_SECRET;

  console.log("JWT_SECRET loaded:", Boolean(secret));
  console.log("JWT_SECRET length:", secret?.length || 0);

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

  let suppliedBuffer;

  try {
    suppliedBuffer = Buffer.from(suppliedSignature, "base64url");
  } catch {
    throw new Error("Invalid confirmation signature.");
  }

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
    !Number.isFinite(payload.expiresAt) ||
    Date.now() > payload.expiresAt
  ) {
    throw new Error("Confirmation expired. Please ask the agent again.");
  }

  return payload;
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
        "Prepare a food diary addition for confirmation. This tool NEVER writes to the database. Use only when the user explicitly requests a diary addition and all required details are known.",
      parameters: {
        type: "object",
        properties: {
          foodName: {
            type: "string",
          },
          quantityGrams: {
            type: "number",
          },
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
      return {
        error: "Invalid date. Use YYYY-MM-DD.",
      };
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

  // 3. Search foods
  if (name === "search_foods") {
    const query = String(args.query || "").trim();

    if (!query || query.length > 100) {
      return {
        error: "Enter a valid food search query.",
      };
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const foods = await Food.find({
      isActive: true,
      $or: [
        {
          name: {
            $regex: escaped,
            $options: "i",
          },
        },
        {
          category: {
            $regex: escaped,
            $options: "i",
          },
        },
      ],
    })
      .select("name category description servingSize nutrients")
      .limit(8)
      .lean();

    return {
      count: foods.length,

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

  // 4. Prepare food diary addition (NO DATABASE WRITE)
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

    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > 5000
    ) {
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
        message:
          "That exact food was not found. Search the food database first.",
      };
    }

    const confirmationToken = signConfirmation({
      userId: String(userId),
      foodId: String(food._id),
      quantityGrams: quantity,
      mealType,
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomUUID(),
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

  return {
    error: "Unknown tool.",
  };
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
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: message,
    },
  ];

  let pendingAction = null;

  // Maximum 5 rounds, with tool choice controlled per round
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

          // Force the diary preparation tool only once.
          // All later rounds use auto to avoid repeated calls.
          tool_choice: forceDiaryTool
            ? {
                type: "function",
                function: {
                  name: "prepare_food_diary_add",
                },
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

    // No more tools required: return final AI answer
    if (toolCalls.length === 0) {
      return {
        reply:
          assistantMessage.content ||
          "I could not generate a response.",

        pendingAction,
      };
    }

    // Execute requested tools
    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") {
        continue;
      }

      const name = toolCall.function.name;

      let result;

      try {
        const args = JSON.parse(
          toolCall.function.arguments || "{}"
        );

        result = await executeTool(
          name,
          args,
          userId,
          message
        );

        if (result.pendingAction) {
          pendingAction = result.pendingAction;

          // Stop immediately after preparing a diary proposal.
          // No second AI tool call is necessary.
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
        console.error(
          `Tool ${name} failed:`,
          error.message
        );

        result = {
          error:
            "Tool execution failed. Do not claim the action succeeded.",
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
    reply:
      "I could not complete that request. Please try asking in a simpler way.",

    pendingAction,
  };
}

// Confirm and save food diary entry
async function confirmAddFoodToDiary(
  { confirmationToken },
  userId
) {
  const payload = verifyConfirmation(
    confirmationToken,
    userId
  );

  if (
    typeof payload.foodId !== "string" ||
    !/^[a-f\d]{24}$/i.test(payload.foodId)
  ) {
    throw new Error("Invalid food selection.");
  }

  const quantity = Number(payload.quantityGrams);
  const mealType = payload.mealType;

  if (
    !Number.isFinite(quantity) ||
    quantity < 1 ||
    quantity > 5000
  ) {
    throw new Error("Invalid food quantity.");
  }

  if (!VALID_MEALS.includes(mealType)) {
    throw new Error("Invalid meal type.");
  }

  const food = await Food.findOne({
    _id: payload.foodId,
    isActive: true,
  });

  if (!food) {
    throw new Error("The selected food is no longer available.");
  }

  const nutrients = scaleNutrients(
    food.nutrients,
    quantity
  );

  // Database write happens only after user confirmation
  const entry = await FoodLog.create({
    user: userId,
    food: food._id,
    mealType,
    quantityGrams: quantity,
    dateKey: getTodayKey(),
    nutrients,
  });

  // Verify saved entry
  const verified = await FoodLog.findOne({
    _id: entry._id,
    user: userId,
  }).lean();

  if (!verified) {
    throw new Error("Diary update could not be verified.");
  }

  return {
    message:
      `${food.name} (${quantity}g) was added to your ${mealType} diary.`,

    verified: true,
    entryId: String(verified._id),
    dateKey: verified.dateKey,
    nutrients: verified.nutrients,
  };
}

module.exports = {
  runNutritionAgent,
  confirmAddFoodToDiary,
};
