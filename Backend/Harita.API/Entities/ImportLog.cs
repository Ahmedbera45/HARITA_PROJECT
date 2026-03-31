namespace Harita.API.Entities
{
    public class ImportLog : BaseEntity
    {
        public string BatchId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int SuccessRows { get; set; }
        public int ErrorRows { get; set; }
        public string? ErrorDetails { get; set; }  // JSON list of row errors
        public Guid ImportedByUserId { get; set; }
        public User ImportedByUser { get; set; }
    }
}
