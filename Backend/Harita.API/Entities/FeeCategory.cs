namespace Harita.API.Entities
{
    public class FeeCategory : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SiraNo { get; set; } = 0;
        public ICollection<FeeRate> FeeRates { get; set; } = new List<FeeRate>();
    }
}
