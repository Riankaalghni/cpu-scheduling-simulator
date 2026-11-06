export function runMLFQ(inputProcesses, quantum1 = 2, quantum2 = 4) {

    // Validasi data proses
    if (!Array.isArray(inputProcesses) || inputProcesses.length === 0) {
        throw new Error("Tambahkan minimal satu proses sebelum menjalankan simulasi.");
    }

    // Validasi quantum
    if (
        !Number.isInteger(quantum1) ||
        quantum1 <= 0 ||
        !Number.isInteger(quantum2) ||
        quantum2 <= 0
    ) {
        throw new Error("Quantum Queue 1 dan Queue 2 harus berupa bilangan bulat positif.");
    }

    // Menyiapkan data proses
    const processes = inputProcesses.map((p, index) => ({
        id: p.id,
        at: Number(p.at),
        bt: Number(p.bt),
        index,
        remaining: Number(p.bt),
        ct: null,
        firstStart: null,
        level: 1,
        quantumLeft: quantum1,
        history: [1],
        preemptions: 0
    }));

    // Menyiapkan tiga antrean proses
    const queues = [[], [], []];

    const segments = [];
    const events = [];

    let time = 0;
    let completed = 0;
    let arrivalCursor = 0;

    // Mengurutkan proses berdasarkan waktu kedatangan
    const arrivals = [...processes].sort(
        (a, b) => a.at - b.at || a.index - b.index
    );

    // Memasukkan proses yang sudah tiba ke Queue 1
    function admitArrivals() {
        while (
            arrivalCursor < arrivals.length &&
            arrivals[arrivalCursor].at <= time
        ) {
            const p = arrivals[arrivalCursor++];

            p.level = 1;
            p.quantumLeft = quantum1;
            queues[0].push(p);

            events.push(`Waktu ${time}: ${p.id} tiba dan masuk Queue 1.`);
        }
    }

    // Proses penjadwalan MLFQ
    while (completed < processes.length) {

        // Memeriksa proses yang sudah tiba
        admitArrivals();

        // Memeriksa apakah semua antrean kosong
        if (queues.every(q => q.length === 0)) {
            if (arrivalCursor < arrivals.length) {
                const nextTime = arrivals[arrivalCursor].at;

                if (nextTime > time) {
                    segments.push({
                        id: "IDLE",
                        start: time,
                        end: nextTime,
                        queue: null,
                        idle: true
                    });

                    events.push(
                        `Waktu ${time}–${nextTime}: CPU idle menunggu proses berikutnya.`
                    );

                    time = nextTime;
                }

                continue;
            }

            break;
        }

        // Memilih antrean dengan prioritas tertinggi
        const levelIndex = queues.findIndex(q => q.length > 0);
        const level = levelIndex + 1;
        const current = queues[levelIndex].shift();

        // Menentukan waktu kedatangan proses berikutnya
        const nextArrival =
            arrivalCursor < arrivals.length
                ? arrivals[arrivalCursor].at
                : Infinity;

        // Menentukan batas waktu eksekusi
        let allowance;

        if (level === 1) {
            allowance = current.quantumLeft;
        } else if (level === 2) {
            allowance = current.quantumLeft;
        } else {
            allowance = Infinity;
        }

        // Menghitung lama proses dijalankan
        const runFor = Math.min(
            current.remaining,
            allowance,
            level > 1 && nextArrival > time
                ? nextArrival - time
                : Infinity
        );

        // Menangani kondisi ketika waktu eksekusi nol
        if (runFor <= 0) {
            admitArrivals();
            queues[levelIndex].unshift(current);
            continue;
        }

        // Mencatat waktu mulai proses
        const start = time;

        if (current.firstStart === null) {
            current.firstStart = start;
        }

        // Memperbarui waktu dan sisa burst time
        time += runFor;
        current.remaining -= runFor;

        if (level < 3) {
            current.quantumLeft -= runFor;
        }

        // Mencatat segmen eksekusi untuk diagram Gantt
        segments.push({
            id: current.id,
            start,
            end: time,
            queue: level,
            idle: false
        });

        // Memeriksa apakah ada proses baru yang menginterupsi
        const arrivalInterrupt =
            level > 1 &&
            current.remaining > 0 &&
            arrivalCursor < arrivals.length &&
            arrivals[arrivalCursor].at === time;

        // Memeriksa apakah proses sudah selesai
        if (current.remaining === 0) {
            current.ct = time;
            completed++;

            events.push(`Waktu ${time}: ${current.id} selesai di Queue ${level}.`);

        } else if (level < 3 && current.quantumLeft <= 0) {
            // Menurunkan proses ke antrean berikutnya
            const nextLevel = level + 1;

            current.level = nextLevel;
            current.quantumLeft = nextLevel === 2 ? quantum2 : Infinity;

            if (!current.history.includes(nextLevel)) {
                current.history.push(nextLevel);
            }

            queues[nextLevel - 1].push(current);

            events.push(
                `Waktu ${time}: quantum Q${level} ${current.id} habis; proses turun ke Queue ${nextLevel}.`
            );

        } else if (arrivalInterrupt) {
            // Menangani interupsi akibat kedatangan proses baru
            current.preemptions++;
            queues[levelIndex].unshift(current);

            events.push(
                `Waktu ${time}: ${current.id} di Queue ${level} dihentikan oleh kedatangan proses baru di Queue 1. Level dan sisa quantum dipertahankan.`
            );

        } else if (level === 3) {
            // Mengembalikan proses ke Queue 3
            queues[2].unshift(current);

        } else {
            // Mengembalikan proses ke antrean sebelumnya
            queues[levelIndex].unshift(current);
        }
    }

    // Menghitung hasil setiap proses
    const rows = processes.map(p => {
        const tat = p.ct - p.at;
        const wt = tat - p.bt;
        const rt = p.firstStart - p.at;

        return {
            id: p.id,
            at: p.at,
            bt: p.bt,
            ct: p.ct,
            tat,
            wt,
            rt,
            history: p.history.map(level => `Q${level}`).join(" → "),
            preemptions: p.preemptions
        };
    });

    // Menghitung total waktu penggunaan CPU
    const cpuTime = segments
        .filter(s => !s.idle)
        .reduce((sum, s) => sum + s.end - s.start, 0);

    // Menghitung total burst time seluruh proses
    const expectedCpu = processes.reduce(
        (sum, p) => sum + p.bt,
        0
    );

    // Memvalidasi total waktu CPU
    if (cpuTime !== expectedCpu) {
        throw new Error(
            `Validasi internal gagal: CPU time ${cpuTime} tidak sama dengan total burst ${expectedCpu}.`
        );
    }

    // Menghitung total waktu simulasi
    const total = Math.max(...segments.map(s => s.end));

    // Menghitung nilai rata-rata
    const average = key =>
        rows.reduce((sum, p) => sum + p[key], 0) / rows.length;

    // Mengembalikan hasil simulasi
    return {
        algorithm: "MLFQ",
        rows,
        segments,
        decisions: events,
        total,
        averages: {
            wt: average("wt"),
            tat: average("tat"),
            rt: average("rt")
        },
        cpuTime,
        expectedCpu
    };
}