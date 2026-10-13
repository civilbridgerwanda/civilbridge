import { sequelize } from "../models/index.js";

/**
 * "Completed projects" on an expert's profile is the number of estimates they
 * personally verified - counted from the estimates table, never typed in or
 * seeded. Recomputed whenever an estimate's verified status changes.
 */
export async function recomputeCompletedProjects(expertId) {
  if (!expertId) return;
  await sequelize.query(
    `UPDATE experts e SET e.completed_projects =
       (SELECT COUNT(*) FROM estimates s WHERE s.reviewed_by = e.id AND s.status = 'verified')
     WHERE e.id = :id`,
    { replacements: { id: expertId } }
  );
}
