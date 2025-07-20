import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Sparkles, UserCircle2 } from "lucide-react"
import markdownit from 'markdown-it'

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

// 1. 定義 API 的 URL，請根據您的後端位置修改
const API_URL = "http://localhost:8000" // 假設您的 FastAPI 運行在 8000 port
const md = new markdownit({
    breaks: true // 將字串中的 '\n' 轉換為 <br>
  });

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // 2. 新增 state 來儲存 session_id 和對話完成狀態
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // =================================================================
  // API Interaction Functions
  // =================================================================

  const fetchFlightInfo = async (currentSessionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/flight/${currentSessionId}`);
      if (!response.ok) throw new Error(`API Error (flight info): ${response.status}`);
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch flight info."));
      return null;
    }
  };

  const fetchHotelInfo = async (currentSessionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/hotel/${currentSessionId}`);
      if (!response.ok) throw new Error(`API Error (hotel info): ${response.status}`);
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch hotel info."));
      return null;
    }
  };

  const fetchRecommendations = (currentSessionId: string) => {
    setIsLoading(true);
    const recommendationMessageId = "llm-recommendation-stream-" + Date.now();
    setMessages(prev => [...prev, { id: recommendationMessageId, role: "assistant", content: "" }]);

    const source = new EventSource(`${API_URL}/api/v1/conversation/results/${currentSessionId}/recommendations`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      if (event.data === "[DONE]") {
        source.close();
        setIsLoading(false);
        return;
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === recommendationMessageId
            ? { ...msg, content: msg.content + event.data }
            : msg
        )
      );
    };

    source.onerror = (err) => {
      console.error("EventSource failed:", err);
      setError(new Error("Failed to fetch recommendations. The connection was closed."));
      source.close();
      setIsLoading(false);
    };
  };

  const fetchSlot = async (currentSessionId: string) => {
    setIsLoading(true);
    const assistantMessageId = "llm-slot-stream-" + Date.now();
    setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    const source = new EventSource(`${API_URL}/api/v1/slot/collection/stream/${currentSessionId}`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      if (event.data === "[DONE]") {
        source.close();
        setIsLoading(false); // Stop loading when the stream is done
        return;
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: msg.content + event.data }
            : msg
        )
      );
    };

    source.onerror = (err) => {
      console.error("EventSource failed:", err);
      setError(new Error("Failed to fetch the next question. The connection was closed."));
      source.close();
      setIsLoading(false);
    };
  };

  const insertSlot = async (currentSessionId: string, userInput: string) => {
    const response = await fetch(`${API_URL}/api/v1/slot/collection/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        session_id: currentSessionId,
        message: userInput,
      }),
    });

    if (!response.ok) throw new Error(`API Error (insert slot): ${response.status}`);
    return await response.json();
  };

  // =================================================================
  // Core Logic Functions
  // =================================================================

  const checkStatusAndFetchNext = async (currentSessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const statusResponse = await fetch(`${API_URL}/api/v1/slot/${currentSessionId}`);
      if (!statusResponse.ok) throw new Error(`API Error (check status): ${statusResponse.status}`);

      const statusData = await statusResponse.json();

      if (statusData.status === 'complete') {
        setIsComplete(true);
        setMessages(prev => [...prev, { id: 'status-complete-' + Date.now(), role: 'assistant', content: '好的，接下來我會幫你尋找航班與住宿' }]);
        
        // Fetch flight and hotel info
        const flightData = await fetchFlightInfo(currentSessionId);
        const hotelData = await fetchHotelInfo(currentSessionId);

        let flightContent = "## ✈️ 航班資訊\n\n";
        if (flightData && flightData.flights) {
          flightData.flights.forEach((flight: any, index: number) => {
            flightContent += `### ${index + 1}. ${flight.airline} ${flight.flight_number}\n\n`;
            flightContent += `| 項目 | 詳細資訊 |\n`;
            flightContent += `|------|----------|\n`;
            flightContent += `| 🛫 **出發** | ${flight.departure_airport.name} (${flight.departure_airport.id}) |\n`;
            flightContent += `| 🕐 **出發時間** | ${flight.departure_airport.time} |\n`;
            flightContent += `| 🛬 **抵達** | ${flight.arrival_airport.name} (${flight.arrival_airport.id}) |\n`;
            flightContent += `| 🕐 **抵達時間** | ${flight.arrival_airport.time} |\n`;
            flightContent += `| ⏱️ **飛行時間** | ${Math.floor(flight.duration / 60)}小時${flight.duration % 60}分鐘 |\n`;
            flightContent += `| ✈️ **機型** | ${flight.airplane} |\n`;
            flightContent += `| 💺 **艙等** | ${flight.travel_class} |\n`;
            flightContent += `| 💰 **價格** | **NT$ ${flight.price.toLocaleString()}** |\n\n`;
            flightContent += `---\n\n`;
          });
        } else {
          flightContent += "暫無航班資訊\n";
        }

        let hotelContent = "## 🏨 住宿資訊\n\n";
        if (hotelData && hotelData.hotels) {
          hotelData.hotels.forEach((hotel: any, index: number) => {
            hotelContent += `### ${index + 1}. ${hotel.name}\n\n`;
            hotelContent += `| 項目 | 詳細資訊 |\n`;
            hotelContent += `|------|----------|\n`;
            
            if (hotel.hotel_class) {
              hotelContent += `| ⭐ **星級** | ${hotel.hotel_class} |\n`;
            }
            
            if (hotel.rate_per_night) {
              hotelContent += `| 💰 **價格** | **${hotel.rate_per_night.lowest}** /晚 |\n`;
            }
            
            if (hotel.overall_rating && hotel.reviews) {
              hotelContent += `| 📊 **評分** | ${hotel.overall_rating.toFixed(1)}/5.0 (${hotel.reviews}則評論) |\n`;
            }
            
            if (hotel.nearby_places && hotel.nearby_places.length > 0) {
              const nearbyPlace = hotel.nearby_places.find((place: any) => 
                place.transportations && place.transportations.some((t: any) => t.type === 'Walking')
              );
              if (nearbyPlace) {
                const walkingTransport = nearbyPlace.transportations.find((t: any) => t.type === 'Walking');
                hotelContent += `| 📍 **附近景點** | ${nearbyPlace.name} (步行 ${walkingTransport.duration}) |\n`;
              }
            }
            hotelContent += `\n---\n\n`;
          });
        } else {
          hotelContent += "暫無住宿資訊\n";
        }
        
        setMessages(prev => [...prev, { id: 'flight-info-' + Date.now(), role: 'assistant', content: flightContent }]);
        setMessages(prev => [...prev, { id: 'hotel-info-' + Date.now(), role: 'assistant', content: hotelContent }]);

        // fetchRecommendations(currentSessionId);
      } else { // 'incomplete' or 'in_progress'
        await fetchSlot(currentSessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to check status or fetch next question."));
      setIsLoading(false);
    }
  };

  const hasStarted = useRef(false);

  // Main useEffect for starting the conversation
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startConversation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/v1/slot/new_session`);
        if (!response.ok) throw new Error(`API Error (new session): ${response.status}`);

        const data = await response.json();
        if (!data.session_id) throw new Error("No session ID returned from server.");
        
        setSessionId(data.session_id);
        await checkStatusAndFetchNext(data.session_id); 
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to start a new session."));
        setIsLoading(false);
      }
    };
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle user message submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId || isComplete) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      await insertSlot(sessionId, currentInput);
      await checkStatusAndFetchNext(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to send message or get next step."));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-aws-purple-medium to-aws-orange-light w-full">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl rounded-xl overflow-hidden border-0 mx-auto">
        <CardContent className="flex-1 p-0 bg-white overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="h-full overflow-y-auto">
            <div
              className={`min-h-full flex flex-col transition-all duration-500 ease-in-out ${messages.length === 0 ? "items-center justify-center" : "items-stretch justify-start pt-6"}`}
            >
              {messages.length === 0 && !isLoading && !error && (
                <div className="text-center transition-all duration-500 ease-in-out p-8">
                  <div className="space-y-3 mt-4">
                    <h3 className="text-2xl font-bold text-black">Travel AI</h3>
                    <p className="text-md text-aws-gray-textMuted max-w-md mx-auto">
                      I can help you find the best flights and hotels. Let's start by gathering some information.
                    </p>
                  </div>
                </div>
              )}

              {isLoading && messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 text-aws-orange animate-spin" />
                </div>
              )}

              {error && (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div className="space-y-3 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <Sparkles className="h-12 w-12 mx-auto text-red-500" />
                    <h3 className="text-xl font-semibold">Oops! Something went wrong.</h3>
                    <p className="text-sm">{error.message || "Please try again later."}</p>
                    <Button onClick={() => window.location.reload()} variant="destructive" size="sm">
                      Refresh
                    </Button>
                  </div>
                </div>
              )}

              

              
                <div className="space-y-6 w-full px-4 md:px-6 pb-8">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-end gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role !== "user" && (
                         <Avatar
                          className={`h-10 w-10 border border-aws-gray-medium shadow-md bg-white ${isLoading && message.id === messages[messages.length - 1]?.id && messages[messages.length - 1].role !== "user" ? "animate-bounce-subtle" : ""}`}
                        >
                          <AvatarImage src="/aws-smile-logo.png" alt="AI Avatar" className="object-contain" />
                          <AvatarFallback className="bg-aws-orange/20 text-aws-orange text-xs">AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-xl px-4 py-3 max-w-[75%] shadow-md ${
                          message.role === "user"
                            ? "bg-aws-orange text-white rounded-br-none"
                            : "bg-aws-gray-light text-aws-gray-dark rounded-bl-none border border-aws-gray-medium"
                        }`}
                      >
                         <div
                          className="prose text-sm text-inherit"
                          dangerouslySetInnerHTML={{ __html: md.render(message.content.replace(/\\n/g, "\n")) }}
                        />
                      </div>

                      {message.role === "user" && (
                         <Avatar className="h-10 w-10 border-2 border-aws-blue-light/50 shadow-md">
                          <AvatarFallback className="bg-aws-blue-light text-white">
                            <UserCircle2 className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                   {isLoading && messages[messages.length - 1]?.role === 'user' && (
                     <div className="flex items-end gap-3 justify-start">
                        <Avatar className="h-10 w-10 border border-aws-gray-medium shadow-md bg-white animate-bounce-subtle">
                           <AvatarImage src="/aws-smile-logo.png" alt="AI Avatar" className="object-contain" />
                           <AvatarFallback className="bg-aws-orange/20 text-aws-orange text-xs">AI</AvatarFallback>
                         </Avatar>
                         <div className="rounded-xl px-4 py-3 max-w-[75%] shadow-md bg-aws-gray-light text-aws-gray-dark rounded-bl-none border border-aws-gray-medium">
                           <Loader2 className="h-5 w-5 animate-spin" />
                         </div>
                     </div>
                   )}
                </div>
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t border-aws-gray-medium p-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-3">
            <Input
              placeholder={isComplete ? "Recommendations are being generated..." : "Enter your message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white border-aws-gray-medium focus-visible:ring-2 focus-visible:ring-aws-orange focus-visible:ring-offset-2 focus-visible:ring-offset-aws-gray-light text-gray-900 placeholder:text-aws-gray-dark/70 rounded-lg py-3 px-4"
              disabled={isLoading || isComplete}
              aria-label="Chat input"
            />
            <Button
              type="submit"
              size="lg"
              className="bg-aws-orange hover:bg-aws-orange-dark text-white rounded-lg px-5 py-3 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:bg-aws-orange/50 disabled:transform-none disabled:shadow-none"
              disabled={isLoading || !input.trim() || isComplete}
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
