/**
 * Application de gestion d'annuaire d'employés
 * Orange Summer Challenge 2025
 *
 * @author Duclair Fopa Kuete
 * @version 1.0.0
 * @description Front-end uniquement avec persistance localStorage
 */

class EmployeeDirectory {
  constructor() {
    this.employees = []
    this.employeeToDelete = null
    this.init()
  }

  init() {
    this.loadEmployees()
    this.bindEvents()
    this.renderEmployees()
    this.updateStats()

    // Ajout de données de test pour la démonstration
    if (this.employees.length === 0) {
      this.addTestData()
    }
  }

  bindEvents() {
    const form = document.getElementById('employeeForm')
    const searchInput = document.getElementById('searchInput')
    const modal = document.getElementById('deleteModal')

    form.addEventListener('submit', this.handleSubmit.bind(this))
    searchInput.addEventListener('input', this.handleSearch.bind(this))

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeDeleteModal()
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        this.closeDeleteModal()
      }
    })

    const inputs = form.querySelectorAll('input')
    inputs.forEach((input) => {
      input.addEventListener('blur', () => this.validateField(input))
      input.addEventListener('input', () => {
        this.clearFieldError(input)

        if (input.value.trim()) {
          this.validateFieldPositive(input)
        }
      })
    })
  }

  /**
   * Gestion de la soumission du formulaire avec validation immédiate
   * @param {Event} e - Événement de soumission
   */
  handleSubmit(e) {
    e.preventDefault()

    const formData = new FormData(e.target)
    const employee = {
      id: Date.now().toString(),
      lastName: formData.get('lastName').trim(),
      firstName: formData.get('firstName').trim(),
      email: formData.get('email').trim().toLowerCase(),
      position: formData.get('position').trim(),
      createdAt: new Date().toISOString(),
    }

    const isValid = this.validateFormComplete(employee)

    if (isValid) {
      if (this.isEmailExists(employee.email, employee.id)) {
        this.showFieldError('email', 'Cet email existe déjà')
        return
      }

      this.addEmployee(employee)
      this.showSuccessMessage()
      e.target.reset()
      this.clearAllErrors()
    } else {
      const formSection = document.querySelector('.form-section')
      formSection.classList.add('shake')
      setTimeout(() => formSection.classList.remove('shake'), 500)
    }
  }

  /**
   * Validation complète du formulaire avec affichage immédiat des erreurs
   * @param {Object} employee - Objet employé à valider
   * @returns {boolean} - Validation réussie ou non
   */
  validateFormComplete(employee) {
    let isValid = true
    const form = document.getElementById('employeeForm')

    const validations = [
      {
        field: 'lastName',
        value: employee.lastName,
        message: 'Le nom est requis',
      },
      {
        field: 'firstName',
        value: employee.firstName,
        message: 'Le prénom est requis',
      },
      {
        field: 'email',
        value: employee.email,
        message: "L'email est requis",
        validator: () =>
          this.isValidEmail(employee.email) ? null : "Format d'email invalide",
      },
      {
        field: 'position',
        value: employee.position,
        message: 'Le poste est requis',
      },
    ]

    validations.forEach((validation) => {
      if (!validation.value) {
        this.showFieldError(validation.field, validation.message)
        isValid = false
      } else if (validation.validator) {
        const error = validation.validator()
        if (error) {
          this.showFieldError(validation.field, error)
          isValid = false
        }
      }
    })

    if (!isValid) {
      const firstError = form.querySelector('.form-group input.error')
      if (firstError) {
        firstError.focus()
      }
    }

    return isValid
  }

  /**
   * Validation d'un champ individuel
   * @param {HTMLInputElement} input - Champ à valider
   */
  validateField(input) {
    const value = input.value.trim()
    const fieldName = input.name

    switch (fieldName) {
      case 'lastName':
      case 'firstName':
      case 'position':
        if (!value) {
          this.showFieldError(
            fieldName,
            `${input.previousElementSibling.textContent.replace(
              ' *',
              ''
            )} est requis`
          )
        } else {
          this.markFieldValid(input)
        }
        break
      case 'email':
        if (!value) {
          this.showFieldError(fieldName, "L'email est requis")
        } else if (!this.isValidEmail(value)) {
          this.showFieldError(fieldName, "Format d'email invalide")
        } else if (this.isEmailExists(value.toLowerCase())) {
          this.showFieldError(fieldName, 'Cet email existe déjà')
        } else {
          this.markFieldValid(input)
        }
        break
    }
  }

  /**
   * Validation positive en temps réel
   * @param {HTMLInputElement} input - Champ à valider positivement
   */
  validateFieldPositive(input) {
    const value = input.value.trim()
    const fieldName = input.name

    switch (fieldName) {
      case 'lastName':
      case 'firstName':
      case 'position':
        if (value) {
          this.markFieldValid(input)
        }
        break
      case 'email':
        if (
          value &&
          this.isValidEmail(value) &&
          !this.isEmailExists(value.toLowerCase())
        ) {
          this.markFieldValid(input)
        }
        break
    }
  }

  /**
   * Marquer un champ comme valide
   * @param {HTMLInputElement} input - Champ à marquer comme valide
   */
  markFieldValid(input) {
    const formGroup = input.closest('.form-group')
    formGroup.classList.add('valid')
    formGroup.classList.remove('has-error')
    input.classList.remove('error')
    const errorElement = document.getElementById(input.name + 'Error')
    errorElement.style.display = 'none'
  }

  /**
   * Validation du format email
   * @param {string} email - Email à valider
   * @returns {boolean} - Email valide ou non
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Vérification de l'existence de l'email
   * @param {string} email - Email à vérifier
   * @param {string} excludeId - ID à exclure de la vérification
   * @returns {boolean} - Email existe ou non
   */
  isEmailExists(email, excludeId = null) {
    return this.employees.some(
      (emp) => emp.email === email && emp.id !== excludeId
    )
  }

  /**
   * Affichage d'une erreur sur un champ amélioré
   * @param {string} fieldName - Nom du champ
   * @param {string} message - Message d'erreur
   */
  showFieldError(fieldName, message) {
    const input = document.getElementById(fieldName)
    const formGroup = input.closest('.form-group')
    const errorElement = document.getElementById(fieldName + 'Error')

    formGroup.classList.remove('valid')
    formGroup.classList.add('has-error')

    input.classList.add('error', 'shake')
    errorElement.textContent = message
    errorElement.classList.add('show')
    errorElement.style.display = 'block'

    setTimeout(() => input.classList.remove('shake'), 500)
  }

  /**
   * Effacement de l'erreur d'un champ
   * @param {HTMLInputElement} input - Champ à nettoyer
   */
  clearFieldError(input) {
    const formGroup = input.closest('.form-group')
    const errorElement = document.getElementById(input.name + 'Error')

    if (formGroup) {
      formGroup.classList.remove('has-error')
      input.classList.remove('error')
    }

    if (errorElement) {
      errorElement.classList.remove('show')
      errorElement.style.display = 'none'
    }
  }

  /**
   * Effacement de toutes les erreurs
   */
  clearAllErrors() {
    const form = document.getElementById('employeeForm')
    const inputs = form.querySelectorAll('input')
    inputs.forEach((input) => {
      this.clearFieldError(input)
      const formGroup = input.closest('.form-group')
      if (formGroup) {
        formGroup.classList.remove('valid')
      }
    })
  }

  /**
   * Ouverture de la modal de confirmation de suppression
   * @param {string} id - ID de l'employé à supprimer
   */
  openDeleteModal(id) {
    const employee = this.employees.find((emp) => emp.id === id)
    if (!employee) return

    this.employeeToDelete = employee

    document.getElementById(
      'employeeToDeleteName'
    ).textContent = `${employee.firstName} ${employee.lastName}`
    document.getElementById('employeeToDeleteEmail').textContent =
      employee.email

    const modal = document.getElementById('deleteModal')
    modal.classList.add('show')

    document.body.style.overflow = 'hidden'

    setTimeout(() => {
      modal.querySelector('.btn-secondary').focus()
    }, 100)
  }

  closeDeleteModal() {
    const modal = document.getElementById('deleteModal')
    modal.classList.remove('show')
    this.employeeToDelete = null

    document.body.style.overflow = ''
  }

  confirmDelete() {
    if (this.employeeToDelete) {
      this.employees = this.employees.filter(
        (emp) => emp.id !== this.employeeToDelete.id
      )
      this.saveEmployees()
      this.renderEmployees()
      this.updateStats()
      this.closeDeleteModal()

      this.showSuccessMessage(
        `Employé ${this.employeeToDelete.firstName} ${this.employeeToDelete.lastName} supprimé avec succès`
      )
    }
  }

  /**
   * Ajout d'un employé
   * @param {Object} employee - Employé à ajouter
   */
  addEmployee(employee) {
    this.employees.push(employee)
    this.saveEmployees()
    this.renderEmployees()
    this.updateStats()
  }

  /**
   * Méthode publique pour supprimer un employé (appelée depuis le HTML)
   * @param {string} id - ID de l'employé à supprimer
   */
  removeEmployee(id) {
    this.openDeleteModal(id)
  }

  /**
   * Recherche d'employés
   * @param {Event} e - Événement de saisie
   */
  handleSearch(e) {
    const query = e.target.value.toLowerCase().trim()
    const filteredEmployees = this.employees.filter(
      (emp) =>
        emp.firstName.toLowerCase().includes(query) ||
        emp.lastName.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.position.toLowerCase().includes(query)
    )
    this.renderEmployees(filteredEmployees)
  }

  /**
   * Rendu de la liste des employés
   * @param {Array} employeesToRender - Employés à afficher
   */
  renderEmployees(employeesToRender = this.employees) {
    const container = document.getElementById('employeesList')

    if (employeesToRender.length === 0) {
      container.innerHTML = `
             <div class="empty-state">
                 <div style="font-size: 4rem; margin-bottom: 20px;">👨‍💼</div>
                 <h3>${
                   this.employees.length === 0
                     ? 'Aucun employé enregistré'
                     : 'Aucun résultat trouvé'
                 }</h3>
                 <p>${
                   this.employees.length === 0
                     ? 'Ajoutez votre premier employé en utilisant le formulaire ci-contre.'
                     : "Essayez avec d'autres mots-clés."
                 }</p>
             </div>
         `
      return
    }

    container.innerHTML = employeesToRender
      .map(
        (employee) => `
         <div class="employee-card" data-id="${employee.id}">
             <div class="employee-header">
                 <div class="employee-name">
                     ${this.escapeHtml(employee.firstName)} ${this.escapeHtml(
          employee.lastName
        )}
                 </div>
                 <button class="btn btn-danger" onclick="app.removeEmployee('${
                   employee.id
                 }')">
                     🗑️ Supprimer
                 </button>
             </div>
             <div class="employee-info">
                 <div>
                     <strong>📧 Email:</strong><br>
                     <a href="mailto:${
                       employee.email
                     }" class="employee-email">${this.escapeHtml(
          employee.email
        )}</a>
                 </div>
                 <div>
                     <strong>💼 Poste:</strong><br>
                     <span class="employee-position">${this.escapeHtml(
                       employee.position
                     )}</span>
                 </div>
             </div>
         </div>
     `
      )
      .join('')

    document.getElementById('employeeCount').textContent =
      employeesToRender.length
  }

  /**
   * Échapper les caractères HTML pour éviter XSS
   * @param {string} text - Texte à échapper
   * @returns {string} - Texte échappé
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Mise à jour des statistiques
   */
  updateStats() {
    const totalEmployees = this.employees.length
    const uniqueDepartments = new Set(this.employees.map((emp) => emp.position))
      .size
    const lastAdded =
      this.employees.length > 0
        ? this.employees[this.employees.length - 1].firstName
        : 'Aucun'

    document.getElementById('totalEmployees').textContent = totalEmployees
    document.getElementById('uniqueDepartments').textContent = uniqueDepartments
    document.getElementById('lastAdded').textContent = lastAdded
  }

  /**
   * Affichage du message de succès amélioré
   * @param {string} customMessage - Message personnalisé optionnel
   */
  showSuccessMessage(customMessage = null) {
    const successMsg = document.getElementById('successMessage')
    if (customMessage) {
      successMsg.textContent = customMessage
    } else {
      successMsg.textContent = '✅ Employé ajouté avec succès !'
    }
    successMsg.style.display = 'block'
    setTimeout(() => {
      successMsg.style.display = 'none'
    }, 4000)
  }

  saveEmployees() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('employees', JSON.stringify(this.employees))
        console.log('Données sauvegardées dans localStorage')
      } else {
        console.warn(
          'localStorage non disponible - les données ne seront pas persistées'
        )
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  loadEmployees() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('employees')
        if (saved) {
          this.employees = JSON.parse(saved)
          console.log('Données chargées depuis localStorage')
        }
      } else {
        console.warn('localStorage non disponible - aucune donnée à charger')
      }
    } catch (error) {
      console.error('Erreur lors du chargement depuis localStorage:', error)
      this.employees = []
    }
  }

  /**
   * Ajout de données de test pour la démonstration
   */
  addTestData() {
    const testEmployees = [
      {
        id: '1',
        firstName: 'Marie',
        lastName: 'Dubois',
        email: 'marie.dubois@orange.fr',
        position: 'Développeuse Full-Stack',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        firstName: 'Pierre',
        lastName: 'Martin',
        email: 'pierre.martin@orange.fr',
        position: 'Chef de Projet',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 'sophie.bernard@orange.fr',
        position: 'UX Designer',
        createdAt: new Date().toISOString(),
      },
    ]

    testEmployees.forEach((emp) => {
      this.employees.push(emp)
    })

    this.saveEmployees()
    this.renderEmployees()
    this.updateStats()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new EmployeeDirectory()
})

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmployeeDirectory
}
