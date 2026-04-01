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
    }

    public class CreateUserDto
    {
        public required string Name { get; set; }
        public required string Surname { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public string? Department { get; set; }
        public string Role { get; set; } = "Staff";
    }

    public class UpdateUserDto
    {
        public required string Name { get; set; }
        public required string Surname { get; set; }
        public required string Email { get; set; }
        public string? Department { get; set; }
        public bool IsActive { get; set; } = true;
        public string Role { get; set; } = "Staff";
    }

    public class ChangePasswordDto
    {
        public required string NewPassword { get; set; }
    }
}
