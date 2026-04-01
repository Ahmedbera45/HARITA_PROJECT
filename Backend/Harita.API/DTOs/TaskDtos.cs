namespace Harita.API.DTOs
{
    public class TaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<AssignedUserDto> AssignedUsers { get; set; } = new();
    }

    public class AssignedUserDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Department { get; set; }
    }

    public class CreateTaskDto
    {
        public required string Title { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = "Bekliyor";
        public string Priority { get; set; } = "Orta";
        public DateTime? DueDate { get; set; }
        public List<Guid> AssignedUserIds { get; set; } = new();
    }

    public class UpdateTaskDto : CreateTaskDto { }

    public class TaskSummaryDto
    {
        public int Pending { get; set; }
        public int InProgress { get; set; }
        public int Done { get; set; }
        public int Total { get; set; }
    }
}
