namespace Harita.API.DTOs
{
    public class TaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; }
        public string Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Listede "Ahmet'e atandı" diye ismini görelim
        public Guid? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; } 
    }

    public class CreateTaskDto
    {
        public required string Title { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = "Bekliyor";
        public string Priority { get; set; } = "Orta";
        public DateTime? DueDate { get; set; }

        // Eğer Şef atama yapıyorsa bu dolu gelir. 
        // Personel kendine ekliyorsa boş gelir (Backend'de otomatik kendisi atanır).
        public Guid? AssignedUserId { get; set; }
    }
    
    // UpdateTaskDto aynen kalabilir (CreateTaskDto'dan miras alıyor zaten)
    public class UpdateTaskDto : CreateTaskDto { }
}