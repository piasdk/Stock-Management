/**
 * Script to seed default roles in the database
 * Run this with: node scripts/seed-roles.js
 */

require("dotenv").config();
const roleService = require("../src/services/role.service");

async function seedRoles() {
  try {
    console.log("Starting role seeding...");
    const roles = await roleService.seedDefaultRoles();
    console.log(`Successfully seeded ${roles.length} roles:`);
    roles.forEach((role) => {
      console.log(`  - ${role.role_name} (ID: ${role.role_id})`);
    });
    console.log("Role seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding roles:", error);
    process.exit(1);
  }
}

seedRoles();

