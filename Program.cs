// using Backend.Models;
// using Microsoft.EntityFrameworkCore;
// using DotnetReactCrud.Hubs;

// var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// var builder = WebApplication.CreateBuilder(args);

// builder.Services.AddCors(options =>
// {
//     options.AddPolicy(name: MyAllowSpecificOrigins,
//                       policy =>
//                       {
//                           policy.WithOrigins("http://localhost:5173")
//                           .AllowAnyMethod()
//                           .AllowAnyHeader()
//                           .AllowCredentials();
//                       });
// });

// // services
// builder.Services.AddControllers();
// builder.Services.AddSignalR();

// string connectionString = builder.Configuration.GetConnectionString("Default") ?? throw new ArgumentNullException("connectionString is null");

// builder.Services.AddDbContext<AppDbContext>(op => op.UseSqlite(connectionString));

// var app = builder.Build();

// app.UseCors(MyAllowSpecificOrigins);
// // middlewares
// app.MapControllers();

// // Во Program.cs:
// app.MapHub<BookingHub>("/bookingHub"); // Смени го /personHub во /bookingHub

// app.Run();

using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Backend.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 🆕 ПОВРЗУВАЊЕ СО SQLITE БАЗАТА
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 1. Додади база, сокети и контролери
builder.Services.AddControllers(); // ОВА Е ЗАДОЛЖИТЕЛНО
builder.Services.AddSignalR();

if (builder.Environment.IsProduction())
{
    // Кога е на Render, ја користи онлајн базата преку Environment Variable
    var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    // Кога си на твојот компјутер, си останува SQLite за полесно тестирање
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                           ?? "Data Source=bookings.db";
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));
}

// 2. Постави ја CORS полисата за твојот React на 5173
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://tvojot-frontend.vercel.app") // Овде после ќе го ставиме линкот од Vercel
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Потребно за SignalR
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>(); //  Замени со твоето вистинско име // Замени со името на твојот DbContext

    // Осигурај се дека базата е креирана
    context.Database.EnsureCreated();

    // Проверка дали табелата за термини (на пример: TimeSlots) е празна
    if (!context.TimeSlots.Any())
    {
        var defaultSlots = new List<TimeSlot>
        {
            new TimeSlot { SlotText = "08:00 - 09:00" },
            new TimeSlot { SlotText = "09:00 - 10:00" },
            new TimeSlot { SlotText = "10:00 - 11:00" },
            new TimeSlot { SlotText = "11:00 - 12:00" },
            new TimeSlot { SlotText = "12:00 - 13:00" },
            new TimeSlot { SlotText = "13:00 - 14:00" },
            new TimeSlot { SlotText = "14:00 - 15:00" },
            new TimeSlot { SlotText = "15:00 - 16:00" },
            new TimeSlot { SlotText = "16:00 - 17:00" },
            new TimeSlot { SlotText = "17:00 - 18:00" },
            new TimeSlot { SlotText = "18:00 - 19:00" },
            new TimeSlot { SlotText = "19:00 - 20:00" },
            new TimeSlot { SlotText = "20:00 - 21:00" },
            new TimeSlot { SlotText = "21:00 - 22:00" },
            new TimeSlot { SlotText = "22:00 - 23:00" }
        };

        context.TimeSlots.AddRange(defaultSlots);
        context.SaveChanges();
    }
}

// 3. Активирај ги сервисите по точен редослед
app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers(); // ОВА Е ЗАДОЛЖИТЕЛНО ЗА ДА РАБОТАТ РУТИТЕ (API-то)
app.MapHub<BookingHub>("/bookingHub");


using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    
    // Ова ќе ја избрише старата база за да се направат новите колони Date и Court
    // (Подоцна, кога ќе имаш важни податоци, ова ќе го тргнеме, но сега е совршено за развој)
    dbContext.Database.EnsureDeleted(); 
    dbContext.Database.EnsureCreated();
}


using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    // ⚠️ Замени го 'BookingContext' со реалното име на твојот DbContext доколку е различно!
    var context = services.GetRequiredService<AppDbContext>(); 

    context.Database.EnsureCreated();

    // Ако табелата за термини е празна, ја полниме со сите почетни термини
    if (!context.TimeSlots.Any())
    {
        var defaultSlots = new List<TimeSlot>
        {
            new TimeSlot { SlotText = "08:00 - 09:00" },
            new TimeSlot { SlotText = "09:00 - 10:00" },
            new TimeSlot { SlotText = "10:00 - 11:00" },
            new TimeSlot { SlotText = "11:00 - 12:00" },
            new TimeSlot { SlotText = "12:00 - 13:00" },
            new TimeSlot { SlotText = "13:00 - 14:00" },
            new TimeSlot { SlotText = "14:00 - 15:00" },
            new TimeSlot { SlotText = "15:00 - 16:00" },
            new TimeSlot { SlotText = "16:00 - 17:00" },
            new TimeSlot { SlotText = "17:00 - 18:00" },
            new TimeSlot { SlotText = "18:00 - 19:00" },
            new TimeSlot { SlotText = "19:00 - 20:00" },
            new TimeSlot { SlotText = "20:00 - 21:00" },
            new TimeSlot { SlotText = "21:00 - 22:00" },
            new TimeSlot { SlotText = "22:00 - 23:00" }
        };

        context.TimeSlots.AddRange(defaultSlots);
        context.SaveChanges();
    }
}
app.Run();


