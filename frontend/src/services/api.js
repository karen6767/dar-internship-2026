export async function sendMessage(message) {
  return {
    reply: `This is a fake AI response to: "${message}"`,
  };
}