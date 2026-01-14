import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a test admin user
  const hashedPassword = await bcryptjs.hash("password123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: hashedPassword,
      permissionLevel: "admin",
      isActive: true,
    },
  });

  console.log("Created admin user:", adminUser.email);

  // Create a test view-only user
  const viewUser = await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: {
      email: "viewer@example.com",
      name: "View User",
      password: hashedPassword,
      permissionLevel: "view",
      isActive: true,
    },
  });

  console.log("Created view user:", viewUser.email);

  // Create a test write user
  const writeUser = await prisma.user.upsert({
    where: { email: "writer@example.com" },
    update: {},
    create: {
      email: "writer@example.com",
      name: "Write User",
      password: hashedPassword,
      permissionLevel: "write",
      isActive: true,
    },
  });

  console.log("Created write user:", writeUser.email);

  // Create an inactive user for testing
  const inactiveUser = await prisma.user.upsert({
    where: { email: "inactive@example.com" },
    update: {},
    create: {
      email: "inactive@example.com",
      name: "Inactive User",
      password: hashedPassword,
      permissionLevel: "view",
      isActive: false,
    },
  });

  console.log("Created inactive user:", inactiveUser.email);

  // Create a denied user for testing
  const deniedUser = await prisma.user.upsert({
    where: { email: "denied@example.com" },
    update: {},
    create: {
      email: "denied@example.com",
      name: "Denied User",
      password: hashedPassword,
      permissionLevel: "denied",
      isActive: true,
    },
  });

  console.log("Created denied user:", deniedUser.email);

  console.log("Database seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
