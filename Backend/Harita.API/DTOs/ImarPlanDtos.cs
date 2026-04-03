namespace Harita.API.DTOs;

public class ImarPlanEkDto
{
    public Guid Id { get; set; }
    public string DosyaAdi { get; set; } = string.Empty;
    public string DosyaYolu { get; set; } = string.Empty;
    public string? DosyaTuru { get; set; }
    public string? Aciklama { get; set; }
    public string? EkleyenAdi { get; set; }
    public DateTime EklenmeTarihi { get; set; }
}

public class AddImarPlanEkDto
{
    public string DosyaAdi { get; set; } = string.Empty;
    public string DosyaYolu { get; set; } = string.Empty;
    public string? DosyaTuru { get; set; }
    public string? Aciklama { get; set; }
}

public class ImarPlanDto
{
    public Guid Id { get; set; }
    public string PlanNo { get; set; } = string.Empty;
    public string PlanAdi { get; set; } = string.Empty;
    public string PlanTuru { get; set; } = string.Empty;
    public string? Mahalle { get; set; }
    public string? Ada { get; set; }
    public string? Parsel { get; set; }
    public decimal? YuzolcumHa { get; set; }
    public string? Konu { get; set; }
    public DateTime? OnayTarihi { get; set; }
    public string? OnayMakami { get; set; }
    public string Durum { get; set; } = string.Empty;
    public string? Aciklama { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ImarPlanEkDto> Ekler { get; set; } = new();
}

public class CreateImarPlanDto
{
    public required string PlanNo { get; set; }
    public required string PlanAdi { get; set; }
    public required string PlanTuru { get; set; }
    public string? Mahalle { get; set; }
    public string? Ada { get; set; }
    public string? Parsel { get; set; }
    public decimal? YuzolcumHa { get; set; }
    public string? Konu { get; set; }
    public DateTime? OnayTarihi { get; set; }
    public string? OnayMakami { get; set; }
    public string Durum { get; set; } = "Yürürlükte";
    public string? Aciklama { get; set; }
}

public class NetworkBrowseResultDto
{
    public string CurrentPath { get; set; } = string.Empty;
    public string? ParentPath { get; set; }
    public List<NetworkItemDto> Directories { get; set; } = new();
    public List<NetworkItemDto> Files { get; set; } = new();
}

public class NetworkItemDto
{
    public string Name { get; set; } = string.Empty;
    public string FullPath { get; set; } = string.Empty;
    public long? Size { get; set; }
}
