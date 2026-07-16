using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        // За реална апликација, чувај го овој клуч во appsettings.json!
        private const string JwtSecret = "SuperSecretKeyThatIsAtLeast32CharactersLong!!!";

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest("Корисникот со овој е-мејл веќе постои.");

            var user = new User
            {
                Email = dto.Email,
                FullName = dto.FullName,
                Role = dto.Role ?? "User",
                // Во реална апликација користи BCrypt за хеширање! На пример: BCrypt.Net.BCrypt.HashPassword(dto.Password)
                PasswordHash = dto.Password
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return Ok("Успешна регистрација!");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto dto)
        {
            // 1. Го бараме корисникот само по е-мејл
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            // 2. Ја проверуваме лозинката преку BCrypt
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized("Погрешен е-мејл или лозинка.");
            }

            // 3. Креирање на JWT токен (код од претходно)
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(JwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
            new Claim("id", user.Id.ToString()),
            new Claim("email", user.Email),
            new Claim("role", user.Role),
            new Claim("fullName", user.FullName)
        }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Ok(new
            {
                Token = tokenString,
                User = new { user.Id, user.Email, user.FullName, user.Role }
            });
        }
    }

    public class UserRegisterDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class UserLoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}