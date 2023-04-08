# prisma practise

You damn prisma, I want to play with you

## 1. 生成 Prisma Client

在你的应用程序中使用 `prisma` 来读取和写入数据库中的数据
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

## 2. 使用自定义模型和字段名称

在某些情况下，尤其是在使用 内省 introspection 时, 将数据库表和列的命名与 Prisma Client API 中使用的名称 分离 可能会很有用。这可以通过在你的 Prisma schema 中使用 @map 和 @@map 属性来实现

```
// 在关系型数据库中表关系
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(256),
    email VARCHAR(256) UNIQUE NOT NULL
);
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    title VARCHAR(256) NOT NULL,
    content TEXT,
    author_id INTEGER REFERENCES users(user_id)
);
CREATE TABLE profiles (
    profile_id SERIAL PRIMARY KEY NOT NULL,
    bio TEXT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id)
);
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(256)
);
CREATE TABLE post_in_categories (
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    category_id INTEGER NOT NULL REFERENCES categories(category_id)
);
CREATE UNIQUE INDEX post_id_category_id_unique ON post_in_categories(post_id int4_ops,category_id int4_ops);

model categories {
  category_id        Int                  @id @default(autoincrement())
  name               String?
  post_in_categories post_in_categories[]
}

// 在prisma中的表关系
model post_in_categories {
  category_id Int
  post_id     Int
  categories  categories @relation(fields: [category_id], references: [category_id])
  posts       posts      @relation(fields: [post_id], references: [post_id])

  @@unique([post_id, category_id], name: "post_id_category_id_unique")
}

model posts {
  author_id          Int?
  content            String?
  created_at         DateTime?            @default(now())
  post_id            Int                  @id @default(autoincrement())
  title              String
  users              users?               @relation(fields: [author_id], references: [user_id])
  post_in_categories post_in_categories[]
}

model profiles {
  bio        String?
  profile_id Int     @id @default(autoincrement())
  user_id    Int     @unique
  users      users   @relation(fields: [user_id], references: [user_id])
}

model users {
  email    String    @unique
  name     String?
  user_id  Int       @id @default(autoincrement())
  posts    posts[]
  profiles profiles?
}
```

## 使用 @map 和 @@map 重命名 Prisma Client API 中的字段和模型

```
model Category {
  category_id        Int                  @id @default(autoincrement())
  post_in_categories post_in_categories[]

  @@map(name: "categories")
}

model PostInCategories {
  category Category @map(name: "category_id")
  post     Post     @map(name: "post_id")

  @@unique([post, category], name: "post_id_category_id_unique")
  @@map(name: "post_in_categories")
}

model Post {
  post_id            Int                @id @default(autoincrement())
  author             User?              @map(name: "author_id")
  post_in_categories PostInCategories[]

  @@map(name: "posts")
}

model Profile {
  profile_id Int  @id @default(autoincrement())
  user_id    User @map(name: "user_id")

  @@map(name: "profiles")
}

model User {
  user_id  Int      @id @default(autoincrement())
  posts    Post[]
  profiles Profile?

  @@map(name: "users")
}
```

## CRUD 增删改查

### 创建单个记录

以下查询创建具有两个字段的单个用户：

```
const user = await prisma.user.create({
  data: {
    email: 'elsa@prisma.io',
    name: 'Elsa Prisma',
  },
})
```

### 创建多个记录

以下查询创建多个用户并跳过任何重复项 (email 必须是唯一的)：

```
const createMany = await prisma.user.createMany({
  data: [
    { name: 'Bob', email: 'bob@prisma.io' },
    { name: 'Bobo', email: 'bob@prisma.io' }, // 唯一键重复!
    { name: 'Yewande', email: 'yewande@prisma.io' },
    { name: 'Angelique', email: 'angelique@prisma.io' },
  ],
  skipDuplicates: true, // 跳过 'Bobo'
})
```

### 读取

以下查询按唯一标识符或 ID 返回单个记录

```
// 按唯一标识符
const user = await prisma.user.findUnique({
  where: {
    email: 'elsa@prisma.io',
  },
})

// 按 ID
const user = await prisma.user.findUnique({
  where: {
    id: 99,
  },
})
```

### 按复合 ID 或复合唯一标识符获取记录

以下示例演示如何通过 @@ID 或 @@unique 定义的复合 ID 或唯一标识符检索记录。

以下 Prisma 模型定义了复合 ID：

```
model TimePeriod {
  year    Int
  quarter Int
  total   Decimal

  @@id([year, quarter])
}
```

要通过此复合 ID 检索时间段，请使用生成的 year_quarter 字段，该字段遵循 fieldName1_fieldName2 模式：

```
const timePeriod = await prisma.timePeriod.findUnique({
  where: {
    year_quarter: {
      quarter: 4,
      year: 2020,
    },
  },
})
```

以下 Prisma 模型使用自定义名称（timePeriodId）定义了一个复合唯一标识符

```
model TimePeriod {
  year    Int
  quarter Int
  total   Decimal

  @@unique(fields: [year, quarter], name: "timePeriodId")
}
```

要通过此唯一标识符检索时间段，请使用自定义 timePeriodId 字段：

```
const timePeriod = await prisma.timePeriod.findUnique({
  where: {
    timePeriodId: {
      quarter: 4,
      year: 2020,
    },
  },
})
```

### 获取所有记录

以下 findMany 查询返回 所有 User 记录：

```
const users = await prisma.user.findMany()
```

### 获取与特定条件匹配的第一条记录

以下 findFirst 查询返回 至少有一个帖子有超过 100 个赞的 最新创建的用户：

按升序 ID 排序用户（最大的优先）- 最大的 ID 是最近的 ID
以升序返回第一个用户，其中至少有一个帖子有 100 个以上的赞

```
const findUser = await prisma.user.findFirst({
    where: {
        posts: {
        some: {
            likes: {
            gt: 100
            }
        }
        }
    },
    orderBy: {
        id: "asc"
    }
})
```

### 按单个字段值过滤

下面的查询返回所有 User 记录，其中包含以 "prisma.io" 结尾的电子邮件：

```
const users = await prisma.user.findMany({
    where: {
        email: {
        endsWith: "prisma.io"
        }
    },
}
```

### 按多个字段值过滤

```
const users = await prisma.user.findMany({
  where: {
    OR: [
      {
        name: {
          startsWith: 'E',
        },
      },
      {
        AND: {
          profileViews: {
            gt: 0,
          },
          role: {
            equals: 'ADMIN',
          },
        },
      },
    ],
  },
})
```

### 按相关记录字段值过滤

```
const users = await prisma.user.findMany({
    where: {
        email: {
        endsWith: "prisma.io"
        },
        posts: {
        some: {
            published: false
        }
        }
    },
}
```

### 更新单个记录

```
const updateUser = await prisma.user.update({
  where: {
    email: 'viola@prisma.io',
  },
  data: {
    name: 'Viola the Magnificent',
  },
})
```

### 更新多个记录

```
const updateUsers = await prisma.user.updateMany({
  where: {
    email: {
      contains: 'prisma.io',
    },
  },
  data: {
    role: 'ADMIN',
  },
})
```

### 更新 或 创建记录

```
const upsertUser = await prisma.user.upsert({
  where: {
    email: 'viola@prisma.io',
  },
  update: {
    name: 'Viola the Magnificent',
  },
  create: {
    email: 'viola@prisma.io',
    name: 'Viola the Magnificent',
  },
})
```

### 更新数字字段

```
const updatePosts = await prisma.post.updateMany({
  data: {
    views: {
      increment: 1,
    },
    likes: {
      increment: 1,
    },
  },
})
```

### 删除单个记录

```
const deleteUser = await prisma.user.delete({
  where: {
    email: 'bert@prisma.io',
  },
})
```

### 删除多个记录

```
const deleteUsers = await prisma.user.deleteMany({
  where: {
    email: {
      contains: 'prisma.io',
    },
  },
})
```

### 删除所有记录

```
const deleteUsers = await prisma.user.deleteMany({})
```

### 级联删除（删除相关记录）

以下查询使用 delete 来删除单个 User 记录:

```
const deleteUser = await prisma.user.delete({
  where: {
    email: 'bert@prisma.io',
  },
})
```

但是，示例 schema 在 Post 和 User 之间包含 必需关系，这意味着你无法删除具有帖子的用户：
要解决这个错误, 你可以:

- 使关系成为可选的:

```
model Post {
  id       Int   @id @default(autoincrement())
  author   User? @relation(fields: [authorId], references: [id])
  authorId Int?
  author   User  @relation(fields: [authorId], references: [id])
  authorId Int
}
```

- 删除用户之前，请将帖子作者更改为其他用户
- 通过事务中的两个单独查询删除用户及其所有帖子（所有查询必须成功）:

```
const deletePosts = prisma.post.deleteMany({
  where: {
    authorId: 7,
  },
})

const deleteUser = prisma.user.delete({
  where: {
    id: 7,
  },
})

const transaction = await prisma.$transaction([deletePosts, deleteUser])
```

## 选择字段

### 返回默认选择集

以下查询返回默认选择集（所有 scalar 字段，无关系）：

```
// 查询返回 User 或 null
const getUser: User | null = await prisma.user.findUnique({
  where: {
    id: 22,
  },
})

// 返回值
{
  id: 22,
  name: "Alice",
  email: "alice@prisma.io",
  profileViews: 0,
  role: "ADMIN",
  coinflips: [true, false],
}
```

### 选择特定字段

使用 select 返回有限的字段子集，而不是所有字段。以下示例仅返回 email 和 name 字段：

```
// 返回一个对象或 null
const getUser: object | null = await prisma.user.findUnique({
  where: {
    id: 22,
  },
  select: {
    email: true,
    name: true,
  },
})

// 返回特定的字段
{
  name: "Alice",
  email: "alice@prisma.io",
}
```

### 包括关系并选择关系字段

以下查询在 include 中使用 select，并返回 所有 用户字段和每篇文章的 title 字段：

```
const users = await prisma.user.findMany({
  // 返回所有用户字段
  include: {
    posts: {
      select: {
        title: true,
      },
    },
  },
})
```
