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
                        new { text = dto?.UserMessage ?? "Hello" }
                    }
                }
            }
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync(url, requestBody);
            var responseString = await response.Content.ReadAsStringAsync();

            // 
            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { 
                    googleError = responseString, 
                    usedUrl = url.Replace(apiKey, "HIDDEN_KEY") 
                });
            }

            var jsonResponse = JsonDocument.Parse(responseString);
            var aiReply = jsonResponse.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return Ok(new { reply = aiReply });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
        }
    }
}

public class UserMessageDto
{
    public string UserMessage { get; set; }
}