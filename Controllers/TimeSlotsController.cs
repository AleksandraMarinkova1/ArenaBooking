using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

using Backend.Models;
using Backend.Hubs;

[ApiController]
[Route("api/[controller]")]
public class TimeSlotsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<BookingHub> _hubContext;

    public TimeSlotsController(AppDbContext context, IHubContext<BookingHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    // 1. Земање на сите активни термини (И за корисникот и за админот)
    [HttpGet]
    public async Task<IActionResult> GetSlots()
    {
        var slots = await _context.TimeSlots
            .Where(s => s.IsActive)
            .OrderBy(s => s.SlotText) // Ги подредува хронолошки
            .ToListAsync();
        return Ok(slots);
    }

    // 2. Додавање на нов термин од страна на админот
    [HttpPost]
    public async Task<IActionResult> AddSlot([FromBody] TimeSlot newSlot)
    {
        if (string.IsNullOrWhiteSpace(newSlot.SlotText))
        {
            return BadRequest("Временскиот термин не може да биде празен.");
        }

        // Проверка дали веќе постои таков термин
        var exists = await _context.TimeSlots.AnyAsync(s => s.SlotText == newSlot.SlotText && s.IsActive);
        if (exists)
        {
            return BadRequest("Овој временски термин веќе постои.");
        }

        newSlot.IsActive = true;
        _context.TimeSlots.Add(newSlot);
        await _context.SaveChangesAsync();

        // Преку SignalR ги известуваме сите (вклучувајќи го и корисникот) дека има нов термин
        await _hubContext.Clients.All.SendAsync("ReceiveTimeSlotsUpdated");

        return Ok(newSlot);
    }

    // 3. Бришење/Деактивирање на термин од страна на админот
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSlot(int id)
    {
        var slot = await _context.TimeSlots.FindAsync(id);
        if (slot == null)
        {
            return NotFound("Терминот не е пронајден.");
        }

        // Наместо хард-делит, само го деактивираме за да не се нарушат старите резервации во базата
        slot.IsActive = false;
        await _context.SaveChangesAsync();

        // Извести ги сите преку сокет за промената
        await _hubContext.Clients.All.SendAsync("ReceiveTimeSlotsUpdated");

        return Ok(new { message = "Терминот е успешно отстранет." });
    }
}