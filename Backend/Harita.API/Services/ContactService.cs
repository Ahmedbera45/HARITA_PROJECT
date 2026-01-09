using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class ContactService : IContactService
    {
        private readonly AppDbContext _context;

        public ContactService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ContactDto>> GetAllAsync()
        {
            return await _context.Contacts
                .Select(c => new ContactDto
                {
                    Id = c.Id,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    Title = c.Title,
                    Institution = c.Institution,
                    PhoneNumber = c.PhoneNumber,
                    Email = c.Email,
                    Description = c.Description
                })
                .ToListAsync();
        }

        public async Task<ContactDto?> GetByIdAsync(Guid id)
        {
            var c = await _context.Contacts.FindAsync(id);
            if (c == null) return null;

            return new ContactDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Title = c.Title,
                Institution = c.Institution,
                PhoneNumber = c.PhoneNumber,
                Email = c.Email,
                Description = c.Description
            };
        }

        public async Task<ContactDto> CreateAsync(CreateContactDto dto)
        {
            var contact = new Contact
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Title = dto.Title,
                Institution = dto.Institution,
                Department = dto.Department,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Description = dto.Description
            };

            _context.Contacts.Add(contact);
            await _context.SaveChangesAsync();

            return new ContactDto
            {
                Id = contact.Id,
                FirstName = contact.FirstName,
                LastName = contact.LastName,
                Title = contact.Title,
                Institution = contact.Institution,
                PhoneNumber = contact.PhoneNumber,
                Email = contact.Email
            };
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var contact = await _context.Contacts.FindAsync(id);
            if (contact == null) return false;

            _context.Contacts.Remove(contact);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ContactDto> UpdateAsync(Guid id, UpdateContactDto dto)
{
        var contact = await _context.Contacts.FindAsync(id);
        if (contact == null) throw new Exception("Kayıt bulunamadı");

        // Verileri güncelle
        contact.FirstName = dto.FirstName;
        contact.LastName = dto.LastName;
        contact.Title = dto.Title;
        contact.Institution = dto.Institution;
        contact.Department = dto.Department;
        contact.PhoneNumber = dto.PhoneNumber;
        contact.Email = dto.Email;
        contact.Description = dto.Description;

        await _context.SaveChangesAsync();

        // Güncel halini geri döndür
        return new ContactDto
        {
            Id = contact.Id,
            FirstName = contact.FirstName,
            LastName = contact.LastName,
            Title = contact.Title,
            Institution = contact.Institution,
            PhoneNumber = contact.PhoneNumber,
            Email = contact.Email,
            Description = contact.Description
        };
    }
    }
}