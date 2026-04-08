namespace Harita.API.DTOs
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Department { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Roles { get; set; } = new();

        // İzin alanları
        public int KalanIzinGunu { get; set; }
        public DateTime? IzinYenilemeTarihi { get; set; }
        public int IzinYenilenecekGun { get; set; }
    }

    public class CreateUserDto
    {
        public required string Name { get; set; }
        public required string Surname { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public string? Department { get; set; }
        public string Role { get; set; } = "Memur";

        // İzin alanları
        public int KalanIzinGunu { get; set; } = 0;
        public DateTime? IzinYenilemeTarihi { get; set; }
        public int IzinYenilenecekGun { get; set; } = 0;
    }

    public class UpdateUserDto
    {
        public required string Name { get; set; }
        public required string Surname { get; set; }
        public required string Email { get; set; }
        public string? Department { get; set; }
        public bool IsActive { get; set; } = true;
        public string Role { get; set; } = "Memur";

        // İzin alanları
        public int KalanIzinGunu { get; set; } = 0;
        public DateTime? IzinYenilemeTarihi { get; set; }
        public int IzinYenilenecekGun { get; set; } = 0;
    }

    public class ChangePasswordDto
    {
        public required string NewPassword { get; set; }
    }
}
