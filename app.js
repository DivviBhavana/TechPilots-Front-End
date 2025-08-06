// app.js

async function loadPieChart() {
  try {
    const response = await fetch("http://localhost:3001/api/portfolio"); // Update with your API if different
    const holdings = await response.json();

    // Transform to stock-wise total value
    const stockLabels = [];
    const stockValues = [];

    for (const holding of holdings) {
      const { stock_ticker, quantity, current_price } = holding;
      const totalValue = quantity * current_price;

      stockLabels.push(stock_ticker);
      stockValues.push(totalValue);
    }

    const options = {
      chart: {
        type: 'donut',
        height: 350
      },
      labels: stockLabels,
      series: stockValues,
      title: {
        text: 'Portfolio Allocation by Stock',
        align: 'center'
      }
    };

    const chart = new ApexCharts(document.querySelector("#pieChart"), options);
    chart.render();
  } catch (error) {
    console.error("Error loading pie chart:", error);
  }
}


async function fetchPortfolio() {
  const res = await fetch("http://localhost:3001/api/portfolio");
  const data = await res.json();

  const tbody = document.getElementById("portfolioBody");
  tbody.innerHTML = "";

  const uniqueTickers = [...new Set(data.map(stock => stock.stock_ticker))];
  document.getElementById("tickerSelect").innerHTML = uniqueTickers
    .map(t => `<option value="${t}">${t}</option>`)
    .join("");

  let prices = {};
  try {
    const liveRes = await fetch(`http://localhost:3001/api/price?tickers=${uniqueTickers.join(",")}`);
    prices = await liveRes.json();
  } catch {
    uniqueTickers.forEach(t => prices[t] = 0);
  }

  for (const stock of data) {
    const { id, stock_ticker, quantity, purchase_price, purchase_date } = stock;
    const livePrice = typeof prices[stock_ticker] === 'number' ? prices[stock_ticker] : 0;
    const currentValue = (livePrice * quantity).toFixed(2);
    const purchaseValue = (purchase_price * quantity).toFixed(2);
    const profitLoss = (currentValue - purchaseValue).toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${stock_ticker}</td>
      <td>${quantity}</td>
      <td>$${purchase_price}</td>
      <td>${new Date(purchase_date).toLocaleDateString()}</td>
      <td>${livePrice ? `$${livePrice}` : "N/A"}</td>
      <td>${livePrice ? `$${currentValue}` : "N/A"}</td>
      <td style="color:${profitLoss >= 0 ? 'green' : 'red'};">
        ${livePrice ? `$${profitLoss}` : "N/A"}
      </td>
      <td><button class="delete-btn" onclick="deleteStock(${id})">Delete</button></td>
    `;
    tbody.appendChild(tr);
  }
}

async function addStock(event) {
  event.preventDefault();
  const ticker = document.getElementById("ticker").value.toUpperCase();
  const quantity = parseFloat(document.getElementById("quantity").value);
  const price = parseFloat(document.getElementById("purchasePrice").value);
  const date = document.getElementById("purchaseDate").value;

  if (!ticker || !quantity || !price || !date) {
    alert("Please fill in all fields.");
    return;
  }

  await fetch("http://localhost:3001/api/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stock_ticker: ticker,
      quantity,
      purchase_price: price,
      purchase_date: date,
    }),
  });

  document.getElementById("stockForm").reset();
  fetchPortfolio();
}



async function deleteStock(id) {
  await fetch(`http://localhost:3001/api/portfolio/${id}`, {
    method: "DELETE"
  });
  fetchPortfolio();
}

let chart = null;

async function loadChart() {
  const ticker = document.getElementById("tickerSelect").value;

  try {
    const res = await fetch(`http://localhost:3001/api/stock-history/${ticker}`);
    const data = await res.json();

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Unexpected data format");
    }

    const prices = data.results.map(entry => ({
      x: new Date(entry.t).toLocaleDateString(),
      y: entry.c
    }));

    const options = {
      chart: {
        type: 'area',
        height: 350
      },
      series: [{
        name: ticker,
        data: prices
      }],
      xaxis: {
        type: 'category'
      },
      yaxis: {
        title: { text: 'Price ($)' }
      },
      title: {
        text: `${ticker} Price Trend (30 days)`,
        align: 'left'
      }
    };

    if (chart) {
      chart.destroy();
    }

    chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
  } catch (err) {
    console.error("Error loading chart data:", err);
  }
}

window.onload = async () => {
  await fetchPortfolio();
  document.getElementById("stockForm").addEventListener("submit", addStock);
  loadChart();
  loadPieChart();
  //loadPieChart();
};
