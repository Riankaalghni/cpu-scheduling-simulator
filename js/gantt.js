const palette = [
    "#D9A6A2",
    "#B7C9AC",
    "#E8C2BE",
    "#C8B5A7",
    "#D8C6A9",
    "#A9B9A0",
    "#D7AAA0",
    "#BDA8A0",
    "#C6CDB8",
    "#E2B9B1"
];

const colorMap = new Map();

function colorFor(id) {
    if (!colorMap.has(id)) {
        colorMap.set(id, palette[colorMap.size % palette.length]);
    }

    return colorMap.get(id);
}

export function renderGantt(container, segments) {
    if (!container) return;

    // Memeriksa ketersediaan data diagram
    if (!segments || !segments.length) {
        container.className = "empty-state";
        container.textContent = "Belum ada data diagram.";
        return;
    }

    const total = Math.max(1, segments[segments.length - 1].end);

    const wrapper = document.createElement("div");
    const scroll = document.createElement("div");

    scroll.className = "gantt-scroll";

    const track = document.createElement("div");

    track.className = "gantt-track";

    segments.forEach(segment => {
        const block = document.createElement("button");

        block.type = "button";
        block.className = `gantt-segment${segment.idle ? " idle" : ""}`;

        const duration = segment.end - segment.start;

        block.style.width = `${
            Math.max(38, duration / total * Math.max(520, total * 45))
        }px`;

        if (!segment.idle) {
            block.style.backgroundColor = colorFor(segment.id);
        }

        block.setAttribute(
            "aria-label",
            segment.idle
                ? `CPU idle dari ${segment.start} sampai ${segment.end}`
                : `${segment.id}, Queue ${segment.queue ?? "SJF"}, waktu ${segment.start} sampai ${segment.end}`
        );

        const name = document.createElement("strong");

        name.textContent = segment.id;

        const time = document.createElement("small");

        time.textContent = `${segment.start}–${segment.end}`;

        block.append(name, time);

        if (segment.queue) {
            const level = document.createElement("span");

            level.className = "level";
            level.textContent = `Q${segment.queue}`;

            block.append(level);
        }

        block.addEventListener("click", () => {
            const detail = wrapper.querySelector(".segment-detail");

            detail.textContent = segment.idle
                ? `CPU tidak menjalankan proses pada waktu ${segment.start} sampai ${segment.end}. Durasi idle: ${duration}.`
                : `${segment.id} berjalan dari waktu ${segment.start} sampai ${segment.end} selama ${duration} satuan waktu${segment.queue ? ` pada Queue ${segment.queue}` : ""}.`;
        });

        track.append(block);
    });

    const ticks = document.createElement("div");

    ticks.className = "gantt-ticks";

    const first = document.createElement("span");
    first.textContent = "0";

    const last = document.createElement("span");
    last.textContent = String(total);

    ticks.append(first, last);

    scroll.append(track, ticks);

    const legend = document.createElement("div");

    legend.className = "gantt-legend";

    const ids = [...new Set(segments.map(s => s.id))];

    ids.forEach(id => {
        const item = document.createElement("span");

        item.className = "legend-item";

        const swatch = document.createElement("i");

        swatch.className = "legend-swatch";

        swatch.style.background =
            id === "IDLE" ? "#E9E3DD" : colorFor(id);

        const label = document.createElement("span");

        label.textContent = id;

        item.append(swatch, label);
        legend.append(item);
    });

    const detail = document.createElement("div");

    detail.className = "segment-detail";
    detail.textContent = "Pilih salah satu segmen untuk melihat detail eksekusi.";

    wrapper.append(scroll, legend, detail);

    container.className = "";
    container.replaceChildren(wrapper);
}