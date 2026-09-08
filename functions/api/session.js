import { json } from '../../lib/util.js';
import { currentUser } from '../../lib/auth.js';
export const onRequestGet = async ({ request, env }) => {
  const user = await currentUser(request, env);
  return json(user ? { loggedIn: true, username: user.username } : { loggedIn: false });
};
