-- 既存データを削除してカラム名を変更
-- 既存のコメントデータを削除
DELETE FROM posts WHERE replyToId IS NOT NULL;

-- SQLite 3.25.0以降では RENAME COLUMN がサポートされています
-- サポートされていない場合は、テーブルを再作成する必要があります
ALTER TABLE posts RENAME COLUMN replyToId TO commentToId;
