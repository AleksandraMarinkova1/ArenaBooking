using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Json;
using System.Text.Json;

[Route("api/[controller]")]
[ApiController]
public class AiAssistantController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public AiAssistantController(IConfiguration configuration, HttpClient httpClient)
    {
        _configuration = configuration;
        _httpClient = httpClient;
    }

    [HttpPost("ask")]
    public async Task<IActionResult> Ask([FromBody] UserMessageDto dto)
    {
        
        var apiKey = _configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("Gemini__ApiKey");

        if (string.IsNullOrEmpty(apiKey))
        {
            return BadRequest(new { error = "Gemini API key is not configured." });
        }

       
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

   
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = dto.UserMessage }
                    }
                }
            }
        };

        try
        {
      
            var response = await _httpClient.PostAsJsonAsync(url, requestBody);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorDetails = await response.Content.ReadAsStringAsync();
                return StatusCode((int)response.StatusCode, new { error = "Gemini API error", details = errorDetails });
            }

            var jsonResponse = await response.Content.ReadFromJsonAsync<JsonElement>();

     
            var aiReply = jsonResponse
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return Ok(new { reply = aiReply });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class UserMessageDto
{
    public string UserMessage { get; set; }
}