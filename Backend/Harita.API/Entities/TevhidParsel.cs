namespace Harita.API.Entities
{
    public class TevhidParsel : BaseEntity
    {
        public Guid TevhidCalculationId { get; set; }
        public TevhidCalculation TevhidCalculation { get; set; } = null!;

        public Guid? ParcelId { get; set; }
        public string Ada { get; set; } = string.Empty;
        public string ParselNo { get; set; } = string.Empty;
        public string? Mahalle { get; set; }
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? MalikAdi { get; set; }
        public string? PlanFonksiyonu { get; set; }
        public int SiraNo { get; set; }
    }
}
