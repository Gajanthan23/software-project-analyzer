/**
 * models/projectModel.js
 * 
 * PostgreSQL model queries for the `projects` table.
 */

const db = require('../utils/db');

const projectModel = {
  /**
   * Create or update a project entry for a user.
   */
  create: async ({
    userId,
    repoUrl,
    owner,
    name,
    description,
    defaultBranch,
    starsCount,
    forksCount,
    languages
  }) => {
    const query = `
      INSERT INTO projects (
        user_id, repo_url, owner, name, description,
        default_branch, stars_count, forks_count, languages
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, owner, name) DO UPDATE SET
        repo_url = EXCLUDED.repo_url,
        description = EXCLUDED.description,
        default_branch = EXCLUDED.default_branch,
        stars_count = EXCLUDED.stars_count,
        forks_count = EXCLUDED.forks_count,
        languages = EXCLUDED.languages,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, repo_url, owner, name, description,
                default_branch, stars_count, forks_count, languages,
                created_at, updated_at;
    `;
    const values = [
      userId,
      repoUrl,
      owner,
      name,
      description || null,
      defaultBranch || 'main',
      starsCount || 0,
      forksCount || 0,
      JSON.stringify(languages || {})
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  /**
   * Find all projects for a specific user.
   */
  findByUser: async (userId) => {
    const query = `
      SELECT id, user_id, repo_url, owner, name, description,
             default_branch, stars_count, forks_count, languages,
             created_at, updated_at
      FROM projects
      WHERE user_id = $1
      ORDER BY updated_at DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  },

  /**
   * Find a specific project by ID and User ID.
   */
  findByIdAndUser: async (id, userId) => {
    const query = `
      SELECT id, user_id, repo_url, owner, name, description,
             default_branch, stars_count, forks_count, languages,
             created_at, updated_at
      FROM projects
      WHERE id = $1 AND user_id = $2;
    `;
    const result = await db.query(query, [id, userId]);
    return result.rows[0];
  }
};

module.exports = projectModel;
