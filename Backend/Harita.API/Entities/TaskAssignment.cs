namespace Harita.API.Entities
{
    /// <summary>Görev-Kullanıcı çoka-çok ilişkisi. Bir göreve birden fazla kişi atanabilir.</summary>
    public class TaskAssignment
    {
        public Guid TaskId { get; set; }
        public AppTask Task { get; set; } = null!;

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
