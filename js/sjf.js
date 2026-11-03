export function runSJF(processes) {
    const pending = processes.map((process, index) => ({
        ...process,
        inputOrder: index
    }));

    const results = [];
    const segments = [];
    const explanation = [];

    let time = 0;

    while (pending.length > 0) {
        const ready = pending
            .filter(process => process.at <= time)
            .sort((a, b) =>
                a.bt - b.bt ||
                a.at - b.at ||
                a.inputOrder - b.inputOrder
            );

        if (ready.length === 0) {
            const nextArrival = Math.min(
                ...pending.map(process => process.at)
            );

            segments.push({
                id: "IDLE",
                start: time,
                end: nextArrival,
                idle: true
            });

            explanation.push(
                `Waktu ${time}–${nextArrival}: CPU idle karena belum ada proses yang tiba.`
            );

            time = nextArrival;
            continue;
        }

        const process = ready[0];

        const start = time;
        const completion = start + process.bt;
        const turnaround = completion - process.at;
        const waiting = turnaround - process.bt;
        const response = start - process.at;

        segments.push({
            id: process.id,
            start,
            end: completion
        });

        results.push({
            ...process,
            start,
            ct: completion,
            tat: turnaround,
            wt: waiting,
            rt: response
        });

        explanation.push(
            `Waktu ${start}–${completion}: ${process.id} dipilih dengan Burst Time ${process.bt}. Proses selesai pada waktu ${completion}.`
        );

        time = completion;

        pending.splice(
            pending.findIndex(item => item.id === process.id),
            1
        );
    }

    const averages = {
        wt: results.reduce((sum, item) => sum + item.wt, 0) / results.length,
        tat: results.reduce((sum, item) => sum + item.tat, 0) / results.length,
        rt: results.reduce((sum, item) => sum + item.rt, 0) / results.length
    };

    return {
        results,
        segments,
        explanation,
        averages,
        total: time
    };
}