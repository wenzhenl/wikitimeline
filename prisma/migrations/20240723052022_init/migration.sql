-- CreateTable
CREATE TABLE "Timeline" (
    "pageName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "wikipediaPage" TEXT NOT NULL,
    "timelineData" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "contributor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTimeline" (
    "collectionId" INTEGER NOT NULL,
    "timelinePageName" TEXT NOT NULL,
    "timelineLanguage" TEXT NOT NULL,

    CONSTRAINT "CollectionTimeline_pkey" PRIMARY KEY ("collectionId","timelinePageName","timelineLanguage")
);

-- CreateIndex
CREATE UNIQUE INDEX "Timeline_pageName_language_key" ON "Timeline"("pageName", "language");

-- CreateIndex
CREATE INDEX "description_idx" ON "Collection"("description");

-- AddForeignKey
ALTER TABLE "CollectionTimeline" ADD CONSTRAINT "CollectionTimeline_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTimeline" ADD CONSTRAINT "CollectionTimeline_timelinePageName_timelineLanguage_fkey" FOREIGN KEY ("timelinePageName", "timelineLanguage") REFERENCES "Timeline"("pageName", "language") ON DELETE RESTRICT ON UPDATE CASCADE;
