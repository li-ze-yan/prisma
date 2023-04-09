import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 创建一条数据
  // const user = await prisma.users.create({
  //   data: {
  //     email: "lizeyan@gmail.com",
  //     name: "Lize Yan",
  //   },
  // });
  // console.log(user);
  // 创建多条数据 sqlite当前不支持createMany()方法
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
