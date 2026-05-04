const fs = require("fs");

const workouts = JSON.parse(fs.readFileSync("all_workouts.json", "utf8"));

const TARGET = {
  circuits: 4,
  minTasks: 90,
  maxTasks: 110,
  minPoint: 2,
  maxPoint: 5.25
};

const badWords = [
  "dont use",
  "don't use",
  "*dont use",
  "throwaway",
  "delete",
  "test",
  "retired"
];

const circuits = [];
const tasksByName = new Map();

function isBadTask(t) {
  const text = `${t.name || ""} ${t.description || ""}`.toLowerCase();
  return badWords.some(w => text.includes(w));
}

for (const w of workouts) {
  for (const c of w.circuits || []) {
    const repCount = (c.anonymous_tasks || [])
      .reduce((sum, a) => sum + Number(a.reps || 0), 0);

    const taskSlots = (c.tasks || []).length;

    if (c.name && c.anonymous_task_list && repCount > 0 && taskSlots > 0) {
      circuits.push({
        id: c.circuit_id || c.id,
        name: c.name,
        anonymous_task_list: c.anonymous_task_list,
        anonymous_tasks: c.anonymous_tasks,
        rep_count: repCount,
        task_slots: taskSlots
      });
    }

    for (const t of c.tasks || []) {
      const pv = Number(t.point_value || 0);

      if (
        t.name &&
        pv >= TARGET.minPoint &&
        pv <= TARGET.maxPoint &&
        !isBadTask(t)
      ) {
        tasksByName.set(t.name, {
          id: t.task_id || t.id,
          name: t.name,
          point_value: pv,
          description: t.description || ""
        });
      }
    }
  }
}

const tasks = [...tasksByName.values()];

console.log("Workouts:", workouts.length);
console.log("Circuits found:", circuits.length);
console.log("Clean tasks found:", tasks.length);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildWorkout() {
  const chosen = [];
  let totalTasks = 0;

  while (chosen.length < TARGET.circuits) {
    const c = pick(circuits);

    if (totalTasks + c.rep_count <= TARGET.maxTasks) {
      chosen.push(c);
      totalTasks += c.rep_count;
    }
  }

  if (totalTasks < TARGET.minTasks) return null;

  return {
    name: "Generated Workout",
    circuit_count: TARGET.circuits,
    task_count: totalTasks,
    circuits: chosen.map(c => ({
      circuit_id: c.id,
      name: c.name,
      anonymous_task_list: c.anonymous_task_list,
      anonymous_tasks: c.anonymous_tasks,
      rep_count: c.rep_count,
      tasks: Array.from({ length: c.task_slots }, (_, i) => ({
        task_number: String(i + 1),
        ...pick(tasks)
      }))
    }))
  };
}

for (let i = 0; i < 50000; i++) {
  const workout = buildWorkout();

  if (workout) {
    fs.writeFileSync(
      "generated_workout.json",
      JSON.stringify(workout, null, 2)
    );

    console.log("DONE:", workout.task_count);
    process.exit();
  }
}

console.log("No match found.");