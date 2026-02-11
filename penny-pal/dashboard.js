import { auth } from "./firebase-config.js";
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://127.0.0.1:5002";
  let currentUser = null;
  let userToken = null;

  const signOutBtn = document.getElementById("signOutBtn");
  const newExpenseBtn = document.getElementById("newExpenseBtn");
  const expenseModal = document.getElementById("expenseModal");
  const closeModal = document.getElementById("closeModal");
  const expenseForm = document.getElementById("expenseForm");
  const incomeForm = document.getElementById("incomeForm");
  const incomeInput = document.getElementById("incomeAmount");
  const totalIncomeDisplay = document.getElementById("totalIncome");
  const totalSpentDisplay = document.getElementById("totalSpent");
  const remainingDisplay = document.getElementById("remaining");
  const expenseList = document.getElementById("expenseList");
  const userWelcome = document.getElementById("userWelcome");
  const deleteIncomeBtn = document.getElementById("deleteIncomeBtn");

  const budgetForm = document.getElementById("budgetForm");
  const budgetAmount = document.getElementById("budgetAmount");
  const budgetInfo = document.getElementById("budgetInfo");
  const deleteBudgetBtn = document.getElementById("deleteBudgetBtn");

  const goalForm = document.getElementById("goalForm");
  const goalTitle = document.getElementById("goalTitle");
  const goalAmount = document.getElementById("goalAmount");
  const deleteGoalBtn = document.getElementById("deleteGoalBtn");
  const goalProgress = document.getElementById("goalProgress");
  let goal = null;

  let budget = null;

  let expenses = [];
  let income = 0;
  let currentChart = null;

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "pennypal.html";
      return;
    }

    currentUser = user;
    userToken = await user.getIdToken();
    userWelcome.textContent = `Welcome, ${user.displayName || user.email}`;

    await loadInitialData();
    setupEventListeners();
    loadGoal();
  });

  async function loadGoal() {
    try {
      const res = await fetch("http://127.0.0.1:5002/api/goal", {
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      const goalsDisplay = document.getElementById("goalsDisplay");
      goalsDisplay.innerHTML = ""; // Clear existing display

      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        goalsDisplay.innerHTML = "<p>No goals set.</p>";
        return;
      }

      data.forEach((goal, index) => {
        const goalBox = document.createElement("div");
        goalBox.className = "goal-box";
        goalBox.innerHTML = `
        <p><strong>Goal ${index + 1}</strong></p>
        <p><strong>Description:</strong> ${goal.description}</p>
        <p><strong>Target:</strong> $${parseFloat(goal.target_amount).toFixed(
          2
        )}
      `;
        goalsDisplay.appendChild(goalBox);
      });
    } catch (err) {
      console.error("Error loading goals:", err);
      document.getElementById("goalsDisplay").innerHTML =
        "<p>Error loading goals</p>";
    }
  }

  async function loadInitialData() {
    // Load Goal
    const goalRes = await fetch(`${API_BASE_URL}/api/goal`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (goalRes.ok) {
      const goalData = await goalRes.json();
      if (goalData.title) goal = goalData;
    }

    // Load Budget
    const budgetResponse = await fetch(`${API_BASE_URL}/api/budget`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (budgetResponse.ok) {
      const budgetData = await budgetResponse.json();
      budget = budgetData.budget || 0;
    }

    try {
      const incomeResponse = await fetch(`${API_BASE_URL}/api/income`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (incomeResponse.ok) {
        const incomeData = await incomeResponse.json();
        income = incomeData.reduce((sum, item) => sum + item.amount, 0);
      }

      const username = currentUser.email.split("@")[0];
      const expensesResponse = await fetch(
        `${API_BASE_URL}/api/expense/${encodeURIComponent(username)}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      if (expensesResponse.ok) {
        expenses = await expensesResponse.json();
      }

      updateUI();
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please refresh the page.");
    }
  }

  function updateUI() {
    expenseList.innerHTML =
      expenses.length > 0
        ? expenses
            .map(
              (expense) => `
            <div class="expense-item" data-id="${expense.id}">
              <div class="expense-info">
                <span class="expense-category">${expense.category}</span>
                <span class="expense-meta">$${expense.amount.toFixed(
                  2
                )} — ${new Date(expense.date).toLocaleDateString()}</span>
              </div>
              <button class="delete-expense" title="Delete">✕</button>
            </div>
          `
            )
            .join("")
        : '<p class="empty-msg">No expenses yet. Click + to add one.</p>';

    if (budget && budget > 0) {
      const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const percentUsed = ((spent / budget) * 100).toFixed(1);
      budgetInfo.textContent = `Budget: $${budget.toFixed(
        2
      )} — ${percentUsed}% used`;
    } else {
      budgetInfo.textContent = "No budget set";
    }

    const totalSpent = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    const remaining = income - totalSpent;

    totalIncomeDisplay.textContent = `$${income.toFixed(2)}`;
    totalSpentDisplay.textContent = `$${totalSpent.toFixed(2)}`;
    remainingDisplay.textContent = `$${remaining.toFixed(2)}`;

    const warningDiv = document.getElementById("budgetWarning");

    if (budget && budget > 0) {
      const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const percentUsed = ((spent / budget) * 100).toFixed(1);
      budgetInfo.textContent = `Budget: $${budget.toFixed(
        2
      )} — ${percentUsed}% used`;

      if (percentUsed > 30) {
        warningDiv.textContent = `Heads up! You've reached ${percentUsed}% of your budget. 
        You're doing great. Just keep an eye out 🤑!`;
      } else {
        warningDiv.textContent = "";
      }
    } else {
      budgetInfo.textContent = "No budget set";
      warningDiv.textContent = "";
    }



    updateChart();
  }

  function updateChart() {
    const ctx = document.getElementById("expenseChart").getContext("2d");

    const categories = {};
    expenses.forEach((expense) => {
      categories[expense.category] =
        (categories[expense.category] || 0) + expense.amount;
    });

    if (currentChart) {
      currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(categories),
        datasets: [
          {
            label: "Expenses by Category",
            data: Object.values(categories),
            backgroundColor: "#4CAF50",
            borderColor: "#388E3C",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${value}`,
            },
          },
        },
      },
    });
  }

  function setupEventListeners() {
    incomeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = parseFloat(incomeInput.value);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid income amount");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/income`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ income: amount }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to save income");
        }

        await loadInitialData();
        incomeInput.value = "";
      } catch (error) {
        console.error("Income save error:", error);
        alert(`Error: ${error.message}`);
      }
    });

    deleteIncomeBtn.addEventListener("click", async () => {
      if (
        !confirm(
          "Are you sure you want to delete all income? This cannot be undone."
        )
      )
        return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/income`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${userToken}` },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to delete income");
        }

        income = 0;
        updateUI();
        alert("All income deleted.");
      } catch (error) {
        console.error("Delete income error:", error);
        alert(`Error: ${error.message}`);
      }
    });

    expenseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("amount").value);
      const category = document.getElementById("category").value;
      const date = document.getElementById("date").value;

      if (isNaN(amount) || !category || !date) {
        alert("Please fill all fields correctly");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/expense`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ amount, category, date }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to save expense");
        }

        const newExpense = await response.json();
        expenses.push(newExpense);
        expenseModal.classList.add("hidden");
        expenseForm.reset();
        updateUI();
      } catch (error) {
        console.error("Expense save error:", error);
        alert(`Error: ${error.message}`);
      }
    });

    expenseList.addEventListener("click", async (e) => {
      if (!e.target.classList.contains("delete-expense")) return;
      const expenseEl = e.target.closest(".expense-item");
      const expenseId = expenseEl.dataset.id;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/expense/${expenseId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to delete expense");
        }

        expenses = expenses.filter((exp) => exp.id != expenseId);
        updateUI();
      } catch (error) {
        console.error("Delete error:", error);
        alert(`Failed to delete expense: ${error.message}`);
      }
    });

    newExpenseBtn.addEventListener("click", () => {
      document.getElementById("date").valueAsDate = new Date();
      expenseModal.classList.remove("hidden");
    });

    closeModal.addEventListener("click", () => {
      expenseModal.classList.add("hidden");
    });

    signOutBtn.addEventListener("click", () => {
      //firebase.auth().signOut();
      window.location.href = "signin.html";

    });
  }

  budgetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = parseFloat(budgetAmount.value);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid budget amount");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) throw new Error("Failed to save budget");

      budget = amount;
      updateUI();
      budgetForm.reset();
    } catch (err) {
      alert(err.message);
    }
  });
  //DELETE BUDGET
  deleteBudgetBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete your budget?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/budget`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete budget");
      }

      budget = null;
      updateUI();
      alert("Budget deleted.");
    } catch (err) {
      console.error("Delete budget error:", err);
      alert(`Error: ${err.message}`);
    }
  });

  document.getElementById("goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const description = document.getElementById("goalDescription").value;
    const target_amount = parseFloat(
      document.getElementById("goalAmount").value
    );

    if (isNaN(target_amount) || target_amount <= 0) {
      alert("Please enter a valid goal amount.");
      return;
    }


    try {
      const res = await fetch("http://127.0.0.1:5002/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, target_amount }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Goal not saved");

      alert("Goal saved!");
      loadGoal(); // refresh the display
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Goal error:", err);
    }
  });


  document
    .getElementById("deleteGoalBtn")
    .addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete your goal?")) return;

      try {
        const res = await fetch("http://127.0.0.1:5002/api/goal", {
          method: "DELETE",
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Delete failed");

        goal = null;
        alert("Goal deleted!");
        document.getElementById("goalDescriptionDisplay").textContent = "None";
        document.getElementById("goalAmountDisplay").textContent = "0.00";

        updateUI();
      } catch (err) {
        console.error("Delete error:", err);
      }
    });
});
