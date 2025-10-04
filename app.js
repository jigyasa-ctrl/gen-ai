import readline from "node:readline/promises";
import 'dotenv/config';
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function main() {
    // create readline interface 
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const messages = [{ 
        role: "system", 
        content: `You are a smart helpful assistant. who can answer questions.
        You have access to the following tools:
        - webSearch({query}: {query: string}) // Search the latest information and real-time data on the web` 
    }];

    while (true) {
        const question = await rl.question('You: ');

        // exit loop on bye
        if (question == "bye") {
            break;
        }
        
        messages.push({
            role: 'user',
            content: question
        });

        while (true) { // make it dynamic
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
            
            messages.push(response.choices[0].message); // maintaining history
            const toolCalls = response.choices[0].message.tool_calls;
            
            if (!toolCalls) {
                console.log(`Assistant: ${response.choices[0].message.content}`);
                break;
            }
            
            for (let tool of toolCalls) { 
                const toolCall = tool;
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);
                
                if (toolName === "webSearch") {
                    const toolResult = await webSearch(toolArgs);
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
    
    rl.close();
}

await main();

async function webSearch({ query }) {
    // here tavily web search api will be used
    console.log("Calling web search");
    const response = await tvly.search(query);
    const finalResult = response.results.map(result => result.content).join("\n\n");
    return finalResult;
}


