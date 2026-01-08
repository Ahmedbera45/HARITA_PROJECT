using System; // Guid ve DateTime için gerekli
using Harita.API.Entities; // BaseEntity ve User aynı namespace'de ise bu satıra gerek kalmayabilir.

namespace Harita.API.Entities  // <-- BU SATIR EKSİKTİ
{
    public class AppTask : BaseEntity
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public DateTime DueDate { get; set; }

        public Guid AssignedToUserId { get; set; }
        public User AssignedToUser { get; set; }

        public Guid CreatedByUserId { get; set; }
        public User CreatedByUser { get; set; }
    }
}