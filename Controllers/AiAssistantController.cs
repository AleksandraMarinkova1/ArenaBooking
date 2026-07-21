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
        try
        {
            if (dto == null || string.IsNullOrEmpty(dto.UserMessage))
            {
                return BadRequest(new { error = "Message cannot be empty." });
            }

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

            var response = await _httpClient.PostAsJsonAsync(url, requestBody);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Gemini API failed", details = responseString });
            }

            using var jsonDoc = JsonDocument.Parse(responseString);
            var root = jsonDoc.RootElement;

       
            if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
            {
                var firstCandidate = candidates[0];
                if (firstCandidate.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts) &&
                    parts.GetArrayLength() > 0)
                {
                    var text = parts[0].GetProperty("text").GetString();
                    return Ok(new { reply = text });
                }
            }

            return StatusCode(500, new { error = "Invalid response structure from Gemini API." });
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