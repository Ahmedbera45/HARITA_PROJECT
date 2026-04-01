using Harita.API.DTOs;
using Harita.API.Entities;
using Harita.API.Services;
using Harita.Tests.Helpers;
using Xunit;

namespace Harita.Tests.Services
{
    public class ContactServiceTests
    {
        // ─── GetByIdAsync ────────────────────────────────────

        [Fact]
        public async Task GetByIdAsync_ReturnsContact_WhenFound()
        {
            var db = TestDbContextFactory.Create(nameof(GetByIdAsync_ReturnsContact_WhenFound));
            var contact = new Contact
            {
                FirstName = "Ayşe",
                LastName = "Demir",
                Title = "Mühendis",
                Institution = "Belediye",
                Department = "Harita",
                Email = "ayse@test.com",
                PhoneNumber = "05551234567"
            };
            db.Contacts.Add(contact);
            db.SaveChanges();

            var service = new ContactService(db);
            var result = await service.GetByIdAsync(contact.Id);

            Assert.NotNull(result);
            Assert.Equal("Ayşe", result!.FirstName);
            Assert.Equal("Harita", result.Department);
        }

        [Fact]
        public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
        {
            var db = TestDbContextFactory.Create(nameof(GetByIdAsync_ReturnsNull_WhenNotFound));
            var service = new ContactService(db);

            var result = await service.GetByIdAsync(Guid.NewGuid());

            Assert.Null(result);
        }

        // ─── GetAllAsync ─────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_ReturnsAllContacts_WithDepartment()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_ReturnsAllContacts_WithDepartment));
            db.Contacts.Add(new Contact
            {
                FirstName = "Ahmet",
                LastName = "Yılmaz",
                Department = "İmar Md.",
                Email = "ahmet@test.com"
            });
            db.SaveChanges();

            var service = new ContactService(db);
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Equal("İmar Md.", result[0].Department);
        }

        [Fact]
        public async Task GetAllAsync_ReturnsEmptyList_WhenNoContacts()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_ReturnsEmptyList_WhenNoContacts));
            var service = new ContactService(db);
            var result = await service.GetAllAsync();
            Assert.Empty(result);
        }

        // ─── CreateAsync ─────────────────────────────────────

        [Fact]
        public async Task CreateAsync_SavesContact_ReturnsDtoWithDepartment()
        {
            var db = TestDbContextFactory.Create(nameof(CreateAsync_SavesContact_ReturnsDtoWithDepartment));
            var service = new ContactService(db);

            var dto = new CreateContactDto
            {
                FirstName = "Zeynep",
                LastName = "Kaya",
                Department = "Fen İşleri",
                Email = "zeynep@test.com",
                PhoneNumber = "05551234567"
            };

            var result = await service.CreateAsync(dto);

            Assert.NotEqual(Guid.Empty, result.Id);
            Assert.Equal("Zeynep", result.FirstName);
            Assert.Equal("Fen İşleri", result.Department);
            Assert.Equal(1, db.Contacts.Count());
        }

        // ─── UpdateAsync ─────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_UpdatesContact_ReturnsUpdatedDto()
        {
            var db = TestDbContextFactory.Create(nameof(UpdateAsync_UpdatesContact_ReturnsUpdatedDto));
            var contact = new Contact
            {
                FirstName = "Eski",
                LastName = "İsim",
                Department = "Eski Dept",
                Email = "eski@test.com"
            };
            db.Contacts.Add(contact);
            db.SaveChanges();

            var service = new ContactService(db);
            var updateDto = new UpdateContactDto
            {
                FirstName = "Yeni",
                LastName = "İsim",
                Department = "Yeni Dept",
                Email = "yeni@test.com"
            };

            var result = await service.UpdateAsync(contact.Id, updateDto);

            Assert.Equal("Yeni", result.FirstName);
            Assert.Equal("Yeni Dept", result.Department);
        }

        [Fact]
        public async Task UpdateAsync_ThrowsException_WhenNotFound()
        {
            var db = TestDbContextFactory.Create(nameof(UpdateAsync_ThrowsException_WhenNotFound));
            var service = new ContactService(db);

            await Assert.ThrowsAsync<Exception>(() =>
                service.UpdateAsync(Guid.NewGuid(), new UpdateContactDto { FirstName = "X", LastName = "X" }));
        }

        // ─── DeleteAsync ─────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_DeletesContact_ReturnsTrue()
        {
            var db = TestDbContextFactory.Create(nameof(DeleteAsync_DeletesContact_ReturnsTrue));
            var contact = new Contact { FirstName = "Test", LastName = "User", Email = "t@t.com" };
            db.Contacts.Add(contact);
            db.SaveChanges();

            var service = new ContactService(db);
            var result = await service.DeleteAsync(contact.Id);

            Assert.True(result);
            Assert.Empty(db.Contacts.ToList());
        }

        [Fact]
        public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
        {
            var db = TestDbContextFactory.Create(nameof(DeleteAsync_ReturnsFalse_WhenNotFound));
            var service = new ContactService(db);
            var result = await service.DeleteAsync(Guid.NewGuid());
            Assert.False(result);
        }
    }
}
