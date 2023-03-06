import connection, {
  followsTb,
  hashLinkrsTb,
  hashtagsTb,
  linkrsTb,
  repostsTb,
  usersTb,
} from "../database/db.js";

export function insertLinkDB(linkUrl, text, userId) {
  return connection.query(
    `INSERT INTO linkrs ("linkUrl", "text", "userId") VALUES
  ($1, $2, $3) RETURNING id;`,
    [linkUrl, text, userId]
  );
}

export function selectLastLinks(userId, limit, offset) {
  return connection.query(
    `SELECT l.*, u."username", u."pictureUrl" AS "userPictureUrl", COUNT(c."linkId") AS "commentsCount", 
    (SELECT us.username 
        FROM ${usersTb} us 
        LEFT JOIN ${repostsTb} r2 ON us.id = r2."reposterId"
        WHERE l.id = ANY(SELECT r3."linkrId" FROM ${repostsTb} r3 WHERE r3."reposterId" = us.id) 
        ORDER BY r2.id DESC LIMIT 1 ) AS "reposter"
FROM linkrs l
JOIN users u ON l."userId" = u.id
LEFT JOIN comments c ON l.id = c."linkId"
GROUP BY l.id, u."username", "userPictureUrl"
ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export function insertLikeLinkDB(likerId, linkId) {
  return connection.query(
    `INSERT INTO likes ("likerId", "linkId") VALUES ($1, $2);`,
    [likerId, linkId]
  );
}

export function removeLikeLinkDB(likerId, linkId) {
  return connection.query(
    `DELETE FROM likes WHERE "likerId" = $1 AND "linkId" = $2;`,
    [likerId, linkId]
  );
}

export async function checkUserLinkPossession(linkrId, userId) {
  return await connection.query(
    `
      SELECT id 
      FROM ${linkrsTb}
      WHERE id = $1 AND "userId" = $2
    `,
    [linkrId, userId]
  );
}

export function usersLikedLinks() {
  return connection.query(
    `SELECT likes."linkId", array_agg(u1."username") AS "likers" 
    FROM likes
      LEFT JOIN users u1 ON likes."likerId" = u1.id
      GROUP BY likes."linkId"
      ORDER BY likes."linkId" DESC LIMIT 20`
  );
}

export function linkrsFilteredByUserId(userPageId, limit, offset) {
  return connection.query(
    `
        SELECT l.*, json_agg(h."hashtag") as "hashtags", u.username, u."pictureUrl" as "userPictureUrl", COUNT(c."linkId") AS "commentsCount"
        FROM ${linkrsTb} l
        LEFT JOIN ${hashLinkrsTb} hl ON l.id = hl."linkId"
        LEFT JOIN ${hashtagsTb} h ON hl."hashtagId" = h.id
        LEFT JOIN ${usersTb} u ON u.id = l."userId"
        LEFT JOIN comments c ON l.id = c."linkId"
        WHERE l."userId" = $1
        GROUP BY l.id, u.username, "userPictureUrl"
        ORDER BY l.id DESC LIMIT $2 OFFSET $3`,
    [userPageId, limit, offset]
  );
}

export function linkrsFilteredByHashtagName(hashtagName) {
  return connection.query(
    `
    SELECT l.*, array_agg(h.hashtag) AS hashtags, u.username, u."pictureUrl" as "userPictureUrl", u.id as "userId", COUNT(c."linkId") AS "commentsCount"
    FROM ${linkrsTb} l
    LEFT JOIN ${hashLinkrsTb} hl ON l.id = hl."linkId"
    LEFT JOIN ${hashtagsTb} h ON hl."hashtagId" = h.id
    LEFT JOIN ${usersTb} u ON l."userId" = u.id
    LEFT JOIN comments c ON l.id = c."linkId"
    GROUP BY l.id, u.username, "userPictureUrl", u.id
    HAVING $1 = ANY(array_agg(h.hashtag))
    `,
    [hashtagName]
  );
}
