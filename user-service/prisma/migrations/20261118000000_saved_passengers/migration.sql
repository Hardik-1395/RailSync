CREATE TABLE "saved_passengers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_passengers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_passengers_userId_normalizedName_age_gender_key"
ON "saved_passengers"("userId", "normalizedName", "age", "gender");

CREATE INDEX "saved_passengers_userId_idx" ON "saved_passengers"("userId");

ALTER TABLE "saved_passengers"
ADD CONSTRAINT "saved_passengers_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
