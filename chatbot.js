import 'dotenv/config';
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import NodeCache from 'node-cache';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

const cache = new NodeCache({stdTTL: 60 * 60 * 24}) // 24 hours clear time / if 0 never clears

export async function generate(userMessage, threadId) {
    const baseMessages = [{ 
        role: "system", 
        content: `You are a smart personal assistant.

                    You have access to a web search tool that you should use when:
                    - The user asks about current events, news, or recent developments
                    - The user asks about real-time information (weather, stock prices, etc.)
                    - You need up-to-date information to provide an accurate answer

                    When you need to search for information, use the webSearch tool with an appropriate query.
                    - webSearch(query: string) - use this tool to fetch unknown or latest information
                    decide when to use your knowlwege and when to use tool.
                    Do not mention the tool in unless needed.
                    
                    Examples: 
                    Q: What is the capital of france?
                    A: The capital of france is Paris
                    
                    Q: What is the weather in mumbai right now?
                    A: (use tool to fetch latest weather)
                    
                    Q: Who is Inda's Prime minister?
                    A: the current Prime minister of India is Narendra Modi.
                    
                    current date and time is ${new Date().toUTCString()}` 
    }];
    const messages = cache.get(threadId) ?? baseMessages

    messages.push({
        role: "user",
        content: userMessage
    })

    const MAX_RETRIES = 10;
    const counter = 0;

  

        while (true) { // make it dynamic
            // avoid infinite loop
            if(counter > MAX_RETRIES){
                return "I couldn't find the result, please try again.";
            }
            counter++;
            
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: messages,
                tools: [
                    {
                        "type": "function",
                        "function": {
                            "name": "webSearch",
                            "description": "Search the latest information and real-time data on the web",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "The query to search on the web"
                                    }
                                },
                                "required": ["query"]
                            }
                        }
                    }
                ],
                tool_choice: 'auto' // llm decides to do tool call or not
            });
            console.log("Response:", JSON.stringify(response, null, 2));
            messages.push(response.choices[0].message); // maintaining history
            const toolCalls = response.choices[0].message.tool_calls;
            
            if (!toolCalls) {
                cache.set(threadId, messages)
                return response.choices[0].message.content;
            }
            
            for (let tool of toolCalls) { 
                const toolCall = tool;
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);
                
                if (toolName === "webSearch") {
                    const toolResult = await webSearch(toolArgs);
                    console.log("Tool result:", toolResult);
                    messages.push({ 
                        role: "tool", 
                        tool_call_id: toolCall.id, 
                        name: toolName,  
                        content: toolResult 
                    }); // maintaining history
                }   
            }
        }
    
}


async function webSearch({ query }) {
    // here tavily web search api will be used
    console.log("Calling web search");
    const response = await tvly.search(query);
    const finalResult = response.results.map(result => result.content).join("\n\n");
    return finalResult;
}


