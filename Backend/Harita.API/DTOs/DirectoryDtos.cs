namespace Harita.API.DTOs;

public class DirectoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Title { get; set; }
    public string Institution { get; set; }
    public string Unit { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string Tags { get; set; }
}

public class CreateDirectoryDto
{
    public string Name { get; set; }
    public string Title { get; set; }
    public string Institution { get; set; }
    public string Unit { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string Tags { get; set; }
}

public class UpdateDirectoryDto
{
    public string Name { get; set; }
    public string Title { get; set; }
    public string Institution { get; set; }
    public string Unit { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string Tags { get; set; }
}

