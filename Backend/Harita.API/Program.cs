using Harita.API.Data;
using Microsoft.EntityFrameworkCore;
using Harita.API.Services; // IAuthService için
using Microsoft.AspNetCore.Authentication.JwtBearer; // JWT için
using Microsoft.IdentityModel.Tokens; // Token validation için
using System.Text; // Encoding için
using Microsoft.OpenApi.Models; // <-- NOKTALI VİRGÜL EKLENDİ

var builder = WebApplication.CreateBuilder(args);

// --- SERVİSLERİN EKLENDİĞİ BÖLÜM ---

// 1. Controller yapısını projeye ekle
builder.Services.AddControllers();

// CORS Politikası: Frontend'den (localhost:5173) gelen isteklere izin ver
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin() // Güvenlik için canlıda sadece frontend URL'si verilir, şimdilik her yere açıyoruz
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
// 2. Swagger / OpenAPI dökümantasyonunu ekle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Harita API", Version = "v1" });

    // JWT Yetkilendirme Ayarı (Kilit butonu için)
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. \r\n\r\n Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer eyJhbGciOiJIUzI1NiIs...\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

// 3. Veritabanı Servisi (PostgreSQL Bağlantısı)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. Servisleri sisteme tanıt (Dependency Injection)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDirectoryService, DirectoryService>();
builder.Services.AddScoped<ITaskService, TaskService>();

// 5. JWT Kimlik Doğrulama Ayarları
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        // "Jwt:Key" olarak düzelttik, appsettings.json ile uyumlu:
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
});

var app = builder.Build();

// --- HTTP REQUEST PIPELINE (MIDDLEWARE) AYARLARI ---

// Geliştirme ortamındaysak Swagger ekranını aç
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication(); // Önce kimlik doğrula (Kimsin?)
app.UseCors();
app.UseAuthorization();  // Sonra yetkilendir (Ne yapabilirsin?)

app.MapControllers(); // API Controller'larını çalıştır

app.Run();