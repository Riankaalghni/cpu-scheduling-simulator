function format(value) {
  return Number(value).toFixed(2);
}

export function renderComparison(container, conclusion, sjf, mlfq) {
  const metrics = [
    {
      key: "wt",
      label: "Rata-rata Waiting Time"
    },
    {
      key: "tat",
      label: "Rata-rata Turnaround Time"
    },
    {
      key: "rt",
      label: "Rata-rata Response Time"
    }
  ];

  const tbody = document.getElementById("comparisonBody");
  tbody.replaceChildren();

  metrics.forEach(metric => {
    const a = sjf.averages[metric.key];
    const b = mlfq.averages[metric.key];

    const winner =
      Math.abs(a - b) < 1e-9
        ? "Sama"
        : a < b
          ? "SJF lebih rendah"
          : "MLFQ lebih rendah";

    const tr = document.createElement("tr");

    [metric.label, format(a), format(b), winner].forEach(
      (value, index) => {
        const td = document.createElement("td");

        td.textContent = value;

        if (index === 3 && winner !== "Sama") {
          td.className = "winner";
        }

        tr.append(td);
      }
    );

    tbody.append(tr);
  });

  const totalRow = document.createElement("tr");

  [
    "Total waktu simulasi",
    sjf.total,
    mlfq.total,
    sjf.total === mlfq.total
      ? "Sama"
      : sjf.total < mlfq.total
        ? "SJF lebih singkat"
        : "MLFQ lebih singkat"
  ].forEach(value => {
    const td = document.createElement("td");
    td.textContent = String(value);
    totalRow.append(td);
  });

  tbody.append(totalRow);

  const chart = document.getElementById("comparisonChart");
  chart.className = "";

  const root = document.createElement("div");
  root.className = "comparison-chart";

  const legend = document.createElement("div");
  legend.className = "chart-legend";

  [["SJF", "sjf"], ["MLFQ", "mlfq"]].forEach(
    ([label, cls]) => {
      const item = document.createElement("span");

      const swatch = document.createElement("i");
      swatch.className = `legend-swatch ${cls}`;

      swatch.style.background =
        cls === "sjf"
          ? "var(--green)"
          : "var(--rose)";

      item.append(swatch, document.createTextNode(label));
      legend.append(item);
    }
  );

  root.append(legend);

  const maxValue = Math.max(
    1,
    ...metrics.flatMap(metric => [
      sjf.averages[metric.key],
      mlfq.averages[metric.key]
    ])
  );

  metrics.forEach(metric => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = metric.label.replace("Rata-rata ", "");

    const pair = document.createElement("div");
    pair.className = "bar-pair";

    [
      ["sjf", sjf.averages[metric.key]],
      ["mlfq", mlfq.averages[metric.key]]
    ].forEach(([cls, value]) => {
      const line = document.createElement("div");
      line.className = "bar-line";

      const bar = document.createElement("div");
      bar.className = `bar-fill ${cls}`;

      bar.style.width = `${Math.max(1, value / maxValue * 100)}%`;
      bar.setAttribute(
        "aria-label",
        `${cls.toUpperCase()} ${format(value)}`
      );

      const number = document.createElement("span");
      number.className = "bar-value";
      number.textContent = format(value);

      line.append(bar, number);
      pair.append(line);
    });

    row.append(label, pair);
    root.append(row);
  });

  chart.replaceChildren(root);

  const items = metrics.map(metric => {
    const a = sjf.averages[metric.key];
    const b = mlfq.averages[metric.key];

    if (Math.abs(a - b) < 1e-9) {
      return `${metric.label}: SJF dan MLFQ menghasilkan nilai sama (${format(a)}).`;
    }

    return `${metric.label}: ${a < b ? "SJF" : "MLFQ"} memiliki nilai lebih rendah (${format(Math.min(a, b))} dibanding ${format(Math.max(a, b))}).`;
  });

  items.push(
    "Tidak ada algoritma yang selalu lebih baik. Hasil dipengaruhi pola kedatangan, burst time, dan konfigurasi quantum."
  );

  conclusion.className = "";

  const list = document.createElement("ul");
  list.className = "conclusion-list";

  items.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.append(li);
  });

  conclusion.replaceChildren(list);
}