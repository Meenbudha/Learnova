import { connectDb } from "@/lib/mongodb";
import { jsonSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rateLimit";
import { withErrorHandler, authenticateRequest } from "@/lib/error-handler";
import { AppError } from "@/lib/errors";

export const GET = withErrorHandler(async (request) => {
  // 1. Token Authentication Check
  const decodedToken = await authenticateRequest(request);

  // 2. Unified Rate Limiting Check (using secure uid instead of spoofable IP)
  const rateLimit = await checkRateLimit(decodedToken.uid);
  if (!rateLimit.allowed) {
    throw new AppError("Too many attempts. Please try again later.", 429);
  }

  // 3. Search query
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  // 4. Database
  const db = await connectDb();
  const users = db.collection("users");

  const allUsers = await users
    .find(query, {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        image: 1,
      },
    })
    .limit(50)
    .toArray();

  // 5. Sanitize Data
  const sanitizedUsers = allUsers.map(({ image, ...rest }) => ({
    ...rest,
    hasImage: !!image,
  }));

  return jsonSuccess(sanitizedUsers, 200);
});