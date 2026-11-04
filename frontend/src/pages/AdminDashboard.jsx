
import { useEffect, useState } from "react";
import { getAdminDashboard } from "../services/adminService";
import api from "../services/api";
import "./AdminDashboard.css";

const initialForm = {
  name: "",
  category: "Fruits",
  description: "",
  servingSize: "100g",
  calories: "",
  protein: "",
  carbohydrates: "",
  fat: "",
  fiber: "",
  sugar: "",
  calcium: "",
  iron: "",
  image: "",
};

const categories = [
  "Fruits",
  "Vegetables",
  "Grains",
  "Protein",
  "Dairy",
  "Nuts & Seeds",
  "Beverages",
  "Other",
];

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [foods, setFoods] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [foodLoading, setFoodLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [message, setMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedRoles, setSelectedRoles] = useState({});

  // Logged-in user
  let currentUser = {};

  try {
    currentUser = JSON.parse(
      localStorage.getItem("balancebite_personal_user") || "{}"
    );
  } catch {
    currentUser = {};
  }

  const currentUserId = String(
    currentUser._id || currentUser.id || ""
  );

  // Dashboard statistics
  const loadDashboard = async () => {
    try {
      const data = await getAdminDashboard();
      setDashboard(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  // Load foods
  const loadFoods = async () => {
    try {
      setFoodLoading(true);

      const response = await api.get("/foods");
      setFoods(response.data.foods || []);
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Unable to load foods."
      );
    } finally {
      setFoodLoading(false);
    }
  };

  // Load users
  const loadUsers = async () => {
    try {
      setUserLoading(true);
      setUserMessage("");

      const params = {};

      if (userSearch.trim()) {
        params.search = userSearch.trim();
      }

      if (roleFilter !== "all") {
        params.role = roleFilter;
      }

      const response = await api.get("/admin/users", {
        params,
      });

      const userList = response.data.users || [];

      setUsers(userList);

      const roleValues = {};

      userList.forEach((user) => {
        roleValues[user._id] = user.role;
      });

      setSelectedRoles((previous) => ({
        ...previous,
        ...roleValues,
      }));
    } catch (err) {
      setUserMessage(
        err.response?.data?.message ||
          "Unable to load users."
      );
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadFoods();
    loadUsers();
  }, []);

  // Food form input
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Add or update food
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim()) {
      setMessage("Please enter the food name.");
      return;
    }

    const nutrients = {
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbohydrates: Number(form.carbohydrates) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      sugar: Number(form.sugar) || 0,
      calcium: Number(form.calcium) || 0,
      iron: Number(form.iron) || 0,
    };

    const foodData = {
      name: form.name.trim(),
      slug: form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      category: form.category,
      description: form.description,
      servingSize: form.servingSize,
      nutrients,
      image: form.image,
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/foods/${editingId}`, foodData);
        setMessage("Food updated successfully!");
      } else {
        await api.post("/foods", foodData);
        setMessage("Food added successfully!");
      }

      setForm(initialForm);
      setEditingId(null);

      await loadFoods();
      await loadDashboard();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Unable to save food. Please check the form."
      );
    } finally {
      setSaving(false);
    }
  };

  // Edit food
  const handleEdit = (food) => {
    setEditingId(food._id);

    setForm({
      name: food.name || "",
      category: food.category || "Fruits",
      description: food.description || "",
      servingSize: food.servingSize || "100g",
      calories: food.nutrients?.calories ?? "",
      protein: food.nutrients?.protein ?? "",
      carbohydrates: food.nutrients?.carbohydrates ?? "",
      fat: food.nutrients?.fat ?? "",
      fiber: food.nutrients?.fiber ?? "",
      sugar: food.nutrients?.sugar ?? "",
      calcium: food.nutrients?.calcium ?? "",
      iron: food.nutrients?.iron ?? "",
      image: food.image || "",
    });

    document.getElementById("admin-food-management")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setMessage("");
  };

  // Delete food
  const handleDelete = async (foodId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this food?"
    );

    if (!confirmed) return;

    try {
      setMessage("");

      await api.delete(`/foods/${foodId}`);

      setMessage("Food deleted successfully!");

      await loadFoods();
      await loadDashboard();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Unable to delete food."
      );
    }
  };

  // Change selected user role
  const handleRoleChange = (userId, role) => {
    setSelectedRoles((previous) => ({
      ...previous,
      [userId]: role,
    }));
  };

  // Update user role
  const handleUpdateRole = async (user) => {
    const newRole = selectedRoles[user._id];

    if (!newRole || newRole === user.role) {
      setUserMessage("No role changes to save.");
      return;
    }

    if (String(user._id) === currentUserId) {
      setUserMessage(
        "You cannot change your own administrator role."
      );
      return;
    }

    const confirmed = window.confirm(
      `Change ${user.name}'s role from ${user.role} to ${newRole}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingUserId(user._id);
      setUserMessage("");

      await api.put(`/admin/users/${user._id}/role`, {
        role: newRole,
      });

      setUserMessage(
        `${user.name}'s role updated successfully!`
      );

      await loadUsers();
      await loadDashboard();
    } catch (err) {
      setUserMessage(
        err.response?.data?.message ||
          "Unable to update user role."
      );

      setSelectedRoles((previous) => ({
        ...previous,
        [user._id]: user.role,
      }));
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Search users
  const handleUserSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  // Loading state
  if (loading) {
    return (
      <div className="admin-loading">
        Loading Admin Dashboard...
      </div>
    );
  }

  // Error state
  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  const stats = dashboard?.stats || {};

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers ?? 0,
      icon: "ðŸ‘¥",
    },
    {
      title: "Total Foods",
      value: stats.totalFoods ?? 0,
      icon: "ðŸ¥—",
    },
    {
      title: "Diary Logs",
      value: stats.totalDiaryLogs ?? 0,
      icon: "ðŸ“Š",
    },
    {
      title: "Administrators",
      value: stats.totalAdmins ?? 0,
      icon: "ðŸ›¡ï¸",
    },
  ];

  return (
    <main className="admin-dashboard">

      {/* HEADER */}
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">
            BALANCEBITE MANAGEMENT
          </p>

          <h1>Admin Dashboard</h1>

          <p>
            Monitor users, foods and nutrition activity.
          </p>
        </div>

        <span className="admin-status">
          â— Admin Access
        </span>
      </div>

      {/* SIDEBAR + MAIN CONTENT */}
      <div className="admin-layout">

        {/* SIDEBAR */}
        <aside className="admin-sidebar">

          <div className="admin-sidebar-brand">
            <span>ðŸ¥—</span>

            <div>
              <h3>BalanceBite</h3>
              <p>Admin Panel</p>
            </div>
          </div>

          <p className="admin-sidebar-label">
            MAIN MENU
          </p>

          <nav className="admin-sidebar-nav">
            <a href="#admin-overview">
              <span>ðŸ“Š</span>
              Overview
            </a>

            <a href="#admin-recent-users">
              <span>ðŸ‘¥</span>
              Recent Users
            </a>

            <a href="#admin-user-management">
              <span>ðŸ›¡ï¸</span>
              User Management
            </a>

            <a href="#admin-food-management">
              <span>ðŸ¥—</span>
              Food Management
            </a>
          </nav>

          <div className="admin-sidebar-note">
            <span>ðŸŒ±</span>
            <p>
              Manage your nutrition platform with care.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="admin-main-content">

          {/* STATISTICS */}
          <section
            className="admin-stats"
            id="admin-overview"
          >
            {cards.map((card) => (
              <article
                className="admin-stat-card"
                key={card.title}
              >
                <div className="admin-stat-icon">
                  {card.icon}
                </div>

                <div>
                  <p>{card.title}</p>
                  <h2>{card.value}</h2>
                </div>
              </article>
            ))}
          </section>

          {/* RECENT USERS */}
          <section
            className="admin-users-section"
            id="admin-recent-users"
          >
            <div className="admin-section-heading">
              <div>
                <h2>Recent Users</h2>
                <p>
                  Latest accounts registered on BalanceBite
                </p>
              </div>

              <span>
                {dashboard?.recentUsers?.length || 0} users
              </span>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard?.recentUsers?.length > 0 ? (
                    dashboard.recentUsers.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>

                        <td>
                          <span
                            className={`admin-role ${
                              user.role === "admin"
                                ? "admin-role-admin"
                                : ""
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        <td>
                          {user.createdAt
                            ? new Date(
                                user.createdAt
                              ).toLocaleDateString()
                            : "â€”"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="admin-empty">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* USER MANAGEMENT */}
          <section
            className="admin-users-section"
            id="admin-user-management"
          >
            <div className="admin-section-heading">
              <div>
                <h2>ðŸ‘¥ User Management</h2>
                <p>
                  Search registered users and manage their roles.
                </p>
              </div>

              <span>{users.length} users</span>
            </div>

            {userMessage && (
              <div className="admin-message">
                {userMessage}
              </div>
            )}

            <form
              className="admin-user-filter"
              onSubmit={handleUserSearch}
            >
              <input
                type="search"
                value={userSearch}
                onChange={(e) =>
                  setUserSearch(e.target.value)
                }
                placeholder="Search by name or email..."
              />

              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value)
                }
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Administrators</option>
              </select>

              <button
                type="submit"
                className="admin-search-btn"
              >
                Search
              </button>
            </form>

            <div className="admin-table-wrapper">
              {userLoading ? (
                <p className="admin-empty">
                  Loading users...
                </p>
              ) : (
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Current Role</th>
                      <th>Change Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.length > 0 ? (
                      users.map((user) => {
                        const isCurrentUser =
                          String(user._id) === currentUserId;

                        return (
                          <tr key={user._id}>
                            <td>
                              {user.name}

                              {isCurrentUser && (
                                <small className="admin-you-label">
                                  You
                                </small>
                              )}
                            </td>

                            <td>{user.email}</td>

                            <td>
                              <span
                                className={`admin-role ${
                                  user.role === "admin"
                                    ? "admin-role-admin"
                                    : ""
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>

                            <td>
                              <select
                                className="admin-role-select"
                                value={
                                  selectedRoles[user._id] ||
                                  user.role
                                }
                                onChange={(e) =>
                                  handleRoleChange(
                                    user._id,
                                    e.target.value
                                  )
                                }
                                disabled={isCurrentUser}
                              >
                                <option value="user">
                                  User
                                </option>

                                <option value="admin">
                                  Admin
                                </option>
                              </select>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="admin-edit-btn"
                                disabled={
                                  isCurrentUser ||
                                  updatingUserId === user._id ||
                                  (selectedRoles[user._id] ||
                                    user.role) === user.role
                                }
                                onClick={() =>
                                  handleUpdateRole(user)
                                }
                              >
                                {updatingUserId === user._id
                                  ? "Updating..."
                                  : "Update"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className="admin-empty"
                        >
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* FOOD MANAGEMENT */}
          <section
            className="admin-food-section"
            id="admin-food-management"
          >
            <div className="admin-section-heading">
              <div>
                <h2>ðŸ¥— Food Management</h2>
                <p>
                  Add, edit and manage nutrition database foods.
                </p>
              </div>

              <span>{foods.length} foods</span>
            </div>

            {message && (
              <div className="admin-message">
                {message}
              </div>
            )}

            {/* FOOD FORM */}
            <form
              className="admin-food-form"
              onSubmit={handleSubmit}
            >
              <div className="admin-form-heading">
                <h3>
                  {editingId ? "Edit Food" : "Add New Food"}
                </h3>

                {editingId && (
                  <button
                    type="button"
                    className="admin-cancel-btn"
                    onClick={cancelEdit}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="admin-form-grid">
                <label>
                  Food Name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Example: Apple"
                    required
                  />
                </label>

                <label>
                  Category *
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    required
                  >
                    {categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Serving Size
                  <input
                    name="servingSize"
                    value={form.servingSize}
                    onChange={handleChange}
                    placeholder="100g"
                  />
                </label>

                <label>
                  Image URL
                  <input
                    name="image"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                  />
                </label>

                <label className="admin-form-full">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Write a short food description..."
                    rows="3"
                  />
                </label>
              </div>

              <h4 className="admin-nutrient-title">
                Nutrition Values
                <span>Per selected serving size</span>
              </h4>

              <div className="admin-form-grid admin-nutrient-grid">
                {[
                  ["calories", "Calories (kcal)"],
                  ["protein", "Protein (g)"],
                  ["carbohydrates", "Carbohydrates (g)"],
                  ["fat", "Fat (g)"],
                  ["fiber", "Fiber (g)"],
                  ["sugar", "Sugar (g)"],
                  ["calcium", "Calcium (mg)"],
                  ["iron", "Iron (mg)"],
                ].map(([name, label]) => (
                  <label key={name}>
                    {label}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>

              <button
                type="submit"
                className="admin-submit-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Food"
                  : "Add Food"}
              </button>
            </form>

            {/* EXISTING FOODS */}
            <div className="admin-food-list">
              <h3>Existing Foods</h3>

              {foodLoading ? (
                <p>Loading foods...</p>
              ) : foods.length === 0 ? (
                <p className="admin-empty">
                  No active foods found.
                </p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-users-table">
                    <thead>
                      <tr>
                        <th>Food</th>
                        <th>Category</th>
                        <th>Calories</th>
                        <th>Protein</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {foods.map((food) => (
                        <tr key={food._id}>
                          <td>{food.name}</td>
                          <td>{food.category}</td>

                          <td>
                            {food.nutrients?.calories ?? 0} kcal
                          </td>

                          <td>
                            {food.nutrients?.protein ?? 0} g
                          </td>

                          <td>
                            <div className="admin-food-actions">
                              <button
                                type="button"
                                className="admin-edit-btn"
                                onClick={() =>
                                  handleEdit(food)
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="admin-delete-btn"
                                onClick={() =>
                                  handleDelete(food._id)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;

