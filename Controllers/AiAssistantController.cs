using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using OpenAI;
using OpenAI.Chat;
using Microsoft.Extensions.Configuration;

namespace Backend.Controllers
{
    [Route("api/aiassistant")]
    [ApiController]
    public class AiAssistantController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AiAssistantController(AppDbContext context, IConfiguration configuration)
        {
            Console.WriteLine("--- AI ASSISTANT CONTROLLER INITIALIZED ---");
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] string userMessage)
        {
          
var slots = _context.Bookings.Where(b => !b.IsBlocked).Take(5).ToList();
string slotInfo = string.Join(", ", slots.Select(s => $"{s.Court} во {s.TimeSlot}"));

       
            var apiKey = _configuration["OpenAI:ApiKey"];
            var client = new OpenAIClient(apiKey);
            var chatClient = client.GetChatClient("gpt-4o");

         
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage($"Ти си асистент за ArenaBooking. Слободни термини се: {slotInfo}. Ако корисникот праша за термин, предложи му некој од овие и дај му линк: /booking"),
                new UserChatMessage(userMessage)
            };

        
            ChatCompletion completion = await chatClient.CompleteChatAsync(messages);

            return Ok(completion.Content[0].Text);
        }
    }
}