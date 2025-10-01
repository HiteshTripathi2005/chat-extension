
export function buildAIPrompt(userMessage, webpageContent, history = []) {
  const isSelectedElement = webpageContent.isSelectedElement || false;

  const systemMessage = `You are Zenix, an AI assistant helping a user understand and interact with ${isSelectedElement ? 'a selected element from' : ''} a webpage. You have access to the ${isSelectedElement ? 'selected element\'s' : 'webpage\'s'} content, title, and metadata.

${isSelectedElement ? 'Selected Element' : 'Webpage'} Information:
- Title: ${webpageContent.title}
- Description: ${webpageContent.description}
- URL: ${webpageContent.url}
- Content: ${webpageContent.content}

Instructions:
1. Be helpful and provide accurate information based on the ${isSelectedElement ? 'selected element' : 'webpage'} content
2. If the user asks about something not in the ${isSelectedElement ? 'selected element' : 'webpage'}, politely explain that
3. Keep responses concise but informative
4. Use the conversation history to maintain context
5. If appropriate, suggest related actions or questions
${isSelectedElement ? '6. Focus specifically on the selected element rather than the entire page' : ''}

Always be helpful, accurate, and maintain a friendly, professional tone.

Available Tools:
- get_current_time: Get the current time in a specified timezone (requires IANA timezone string like 'Asia/Kolkata' for India)`;

  // Build messages array
  const messages = [
    { role: 'system', content: systemMessage }
  ];

  // Add conversation history
  history.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  console.log('Constructed AI Messages:');
  console.log(JSON.stringify(messages, null, 2));
  console.log("end of messages");

  return messages;
}
