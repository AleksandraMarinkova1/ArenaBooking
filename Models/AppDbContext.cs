using Microsoft.EntityFrameworkCore;

namespace Backend.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Booking> Bookings { get; set; } // Новата табела во SQLite
        public DbSet<User> Users { get; set; }
        public DbSet<TimeSlot> TimeSlots { get; set; }
    }
}