const app = {
  data: {
    vocabularies: [],
    grammars: [],
    vocabCategories: ["Basic Greetings", "Food", "Places", "Actions"],
    grammarCategories: [
      "Basic Endings",
      "Conjunctions",
      "Honorifics",
      "Tenses",
    ],
    learningStatuses: ["New", "Learning", "Review", "Mastered"],
    geminiApiKey: "",
  },
  currentSection: "vocabulary",
  itemsPerPage: 10, // For main tables
  settingsItemsPerPage: 5, // For settings lists

  // Pagination state for main tables
  vocabCurrentPage: 1,
  grammarCurrentPage: 1,

  // Pagination state for settings lists
  vocabCategoryCurrentPage: 1,
  grammarCategoryCurrentPage: 1,
  statusCurrentPage: 1,

  quiz: {
    currentQuestionIndex: 0,
    score: 0,
    questions: [],
    allWords: [],
  },

  // --- Core Data Management ---
  loadData() {
    try {
      const savedData = localStorage.getItem("koreanLearningApp");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Merge with default data to ensure all keys exist and new properties are not lost on load
        this.data = { ...this.data, ...parsedData };
        // Ensure newly added default statuses are present if not in loaded data
        if (
          !parsedData.learningStatuses ||
          parsedData.learningStatuses.length === 0
        ) {
          this.data.learningStatuses = [
            "New",
            "Learning",
            "Review",
            "Mastered",
          ];
        }
        // Ensure 'resource' property in vocabularies and grammars is always an array
        this.data.vocabularies.forEach((item) => {
          if (typeof item.resource === "string") {
            item.resource = item.resource
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s);
          } else if (!Array.isArray(item.resource)) {
            item.resource = [];
          }
        });
        this.data.grammars.forEach((item) => {
          if (typeof item.resource === "string") {
            item.resource = item.resource
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s);
          } else if (!Array.isArray(item.resource)) {
            item.resource = [];
          }
        });
      }
    } catch (e) {
      console.error("Error loading data from localStorage:", e);
      this.showMessage(
        "Error",
        "Failed to load data from local storage. Your data might be corrupted.",
        false
      );
    }
    this.updateCategoryFilters();
    this.updateStatusFilters(); // Call to update status filters
  },

  saveData() {
    try {
      localStorage.setItem("koreanLearningApp", JSON.stringify(this.data));
    } catch (e) {
      console.error("Error saving data to localStorage:", e);
      this.showMessage(
        "Error",
        "Failed to save data to local storage. Please check your browser's storage settings.",
        false
      );
    }
  },

  // --- UI Modals ---
  showModal(
    modalId,
    title = "",
    message = "",
    isConfirm = false,
    onConfirm = null
  ) {
    const $modal = $(`#${modalId}`);
    const $title = $modal.find(`#${modalId}Title`);
    const $text = $modal.find(`#${modalId}Text`);
    const $confirmBtn = $modal.find(`#confirmMessageModalBtn`);
    const $cancelBtn = $modal.find(`#cancelMessageModalBtn`); // Added for explicit cancel
    const $closeBtn = $modal.find(`#closeMessageModalBtn`);

    // Reset visibility for all buttons
    $confirmBtn.addClass("hidden").off("click");
    $cancelBtn.addClass("hidden").off("click");
    $closeBtn.addClass("hidden").off("click");

    if (modalId === "messageModal") {
      $title.text(title);
      $text.text(message);
      if (isConfirm) {
        $confirmBtn.removeClass("hidden");
        $cancelBtn.removeClass("hidden");
        $confirmBtn.on("click", () => {
          $modal.removeClass("show");
          if (onConfirm) onConfirm(true); // Pass true for confirm
        });
        $cancelBtn.on("click", () => {
          $modal.removeClass("show");
          if (onConfirm) onConfirm(false); // Pass false for cancel
        });
      } else {
        $closeBtn.removeClass("hidden");
        $closeBtn.on("click", () => {
          $modal.removeClass("show");
        });
      }
    }

    $modal.addClass("show");
  },

  closeModal(modalId) {
    $(`#${modalId}`).removeClass("show");
  },

  showMessage(title, message, isConfirm = false, onConfirm = null) {
    this.showModal("messageModal", title, message, isConfirm, onConfirm);
  },

  // --- Section Management ---
  showSection(sectionId) {
    $(".section-content").removeClass("active");
    $(`#${sectionId}`).addClass("active");
    $(".nav-link")
      .removeClass("font-bold text-blue-100")
      .addClass("text-white");
    $(`.nav-link[data-section="${sectionId}"]`).addClass(
      "font-bold text-blue-100"
    );
    this.currentSection = sectionId;
    // Re-render relevant lists when section changes
    if (sectionId === "vocabulary") {
      this.renderVocabularies();
    } else if (sectionId === "grammar") {
      this.renderGrammars();
    } else if (sectionId === "settings") {
      this.renderCategories();
      this.renderStatuses();
      this.displayApiKey();
    } else if (sectionId === "review-quiz") {
      this.hideQuizAndFlashcards();
    }
  },

  // --- Category Management (for Settings) ---
  renderCategories() {
    const renderCategoryList = (listId, categories, type) => {
      const $list = $(`#${listId}`);
      $list.empty();

      let currentPageProp;
      if (type === "vocab") currentPageProp = this.vocabCategoryCurrentPage;
      else currentPageProp = this.grammarCategoryCurrentPage;

      const paginatedCategories = this.paginate(
        categories,
        currentPageProp,
        this.settingsItemsPerPage
      );

      if (paginatedCategories.length === 0) {
        $list.append(
          '<li class="text-center py-2 text-gray-500">No categories found.</li>'
        );
      } else {
        paginatedCategories.forEach((category) => {
          $list.append(`
                                        <li class="flex justify-between items-center py-1">
                                            <span class="text-gray-800">${category}</span>
                                            <button data-category="${category}" data-type="${type}" class="delete-category-btn text-red-500 hover:text-red-700 ml-2 transition-colors duration-200">
                                                <i class="fas fa-times-circle"></i>
                                            </button>
                                        </li>
                                    `);
        });
      }
      this.updateSettingsPaginationControls(
        `${type}Category`,
        categories.length,
        currentPageProp
      );
    };
    renderCategoryList("vocabCategoryList", this.data.vocabCategories, "vocab");
    renderCategoryList(
      "grammarCategoryList",
      this.data.grammarCategories,
      "grammar"
    );
  },

  addCategory(type, categoryName) {
    if (!categoryName) {
      this.showMessage("Input Required", "Category name cannot be empty.");
      return;
    }
    let categories =
      type === "vocab"
        ? this.data.vocabCategories
        : this.data.grammarCategories;
    if (!categories.includes(categoryName)) {
      categories.push(categoryName);
      categories.sort(); // Keep categories sorted
      this.saveData();
      this.renderCategories();
      this.updateCategoryFilters();
      this.showMessage("Success", `Category "${categoryName}" added.`);
    } else {
      this.showMessage("Info", `Category "${categoryName}" already exists.`);
    }
    // Clear input after adding
    if (type === "vocab") $("#newVocabCategoryInput").val("");
    else $("#newGrammarCategoryInput").val("");
  },

  deleteCategory(type, categoryName) {
    this.showMessage(
      "Confirm Delete",
      `Are you sure you want to delete the category "${categoryName}"? This will remove it from all associated items.`,
      true,
      (confirmed) => {
        if (!confirmed) return;
        let categories =
          type === "vocab"
            ? this.data.vocabCategories
            : this.data.grammarCategories;
        let items =
          type === "vocab" ? this.data.vocabularies : this.data.grammars;

        // Remove category from list
        this.data[type + "Categories"] = categories.filter(
          (cat) => cat !== categoryName
        );

        // Update items associated with this category to a default or null
        items.forEach((item) => {
          if (item.category === categoryName) {
            item.category = "Uncategorized"; // Or another default
          }
        });
        this.saveData();
        this.renderCategories();
        this.updateCategoryFilters();
        if (type === "vocab") this.renderVocabularies();
        else this.renderGrammars();
        this.showMessage("Success", `Category "${categoryName}" deleted.`);
      }
    );
  },

  // --- Status Management (for Settings) ---
  renderStatuses() {
    const $list = $(`#statusList`);
    $list.empty();

    const paginatedStatuses = this.paginate(
      this.data.learningStatuses,
      this.statusCurrentPage,
      this.settingsItemsPerPage
    );

    if (paginatedStatuses.length === 0) {
      $list.append(
        '<li class="text-center py-2 text-gray-500">No statuses found.</li>'
      );
    } else {
      paginatedStatuses.forEach((status) => {
        $list.append(`
                                    <li class="flex justify-between items-center py-1">
                                        <span class="text-gray-800">${status}</span>
                                        <button data-status="${status}" class="delete-status-btn text-red-500 hover:text-red-700 ml-2 transition-colors duration-200">
                                            <i class="fas fa-times-circle"></i>
                                        </button>
                                    </li>
                                `);
      });
    }
    this.updateSettingsPaginationControls(
      "status",
      this.data.learningStatuses.length,
      this.statusCurrentPage
    );
  },

  addStatus(statusName) {
    if (!statusName) {
      this.showMessage("Input Required", "Status name cannot be empty.");
      return;
    }
    if (!this.data.learningStatuses.includes(statusName)) {
      this.data.learningStatuses.push(statusName);
      this.data.learningStatuses.sort();
      this.saveData();
      this.renderStatuses();
      this.showMessage("Success", `Status "${statusName}" added.`);
    } else {
      this.showMessage("Info", `Status "${statusName}" already exists.`);
    }
    $("#newStatusInput").val(""); // Clear input after adding
  },

  deleteStatus(statusName) {
    this.showMessage(
      "Confirm Delete",
      `Are you sure you want to delete the status "${statusName}"? All items currently with this status will be reset to 'New'.`,
      true,
      (confirmed) => {
        if (!confirmed) return;
        this.data.learningStatuses = this.data.learningStatuses.filter(
          (s) => s !== statusName
        );
        // Update items associated with this status to 'New' or a default
        const defaultStatus =
          this.data.learningStatuses.length > 0
            ? this.data.learningStatuses[0]
            : "New";
        this.data.vocabularies.forEach((item) => {
          if (item.status === statusName) item.status = defaultStatus;
        });
        this.data.grammars.forEach((item) => {
          if (item.status === statusName) item.status = defaultStatus;
        });
        this.saveData();
        this.renderStatuses();
        this.renderVocabularies(); // Re-render lists to reflect changes
        this.renderGrammars();
        this.showMessage("Success", `Status "${statusName}" deleted.`);
      }
    );
  },

  updateCategoryFilters() {
    const updateFilter = (selectId, categories) => {
      const $select = $(`#${selectId}`);
      $select.empty().append('<option value="">All Categories</option>');
      categories.forEach((category) => {
        $select.append(`<option value="${category}">${category}</option>`);
      });
    };
    updateFilter("vocabCategoryFilter", this.data.vocabCategories);
    updateFilter("grammarCategoryFilter", this.data.grammarCategories);
  },

  // New: Populate and update status filter dropdowns
  updateStatusFilters() {
    const updateFilter = (selectId, statuses) => {
      const $select = $(`#${selectId}`);
      $select.empty().append('<option value="">All Statuses</option>');
      statuses.forEach((status) => {
        $select.append(`<option value="${status}">${status}</option>`);
      });
    };
    updateFilter("vocabStatusFilter", this.data.learningStatuses);
    updateFilter("grammarStatusFilter", this.data.learningStatuses);
  },

  // --- Pagination Helper for Main Tables ---
  paginate(items, currentPage, itemsPerPage) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  },

  // --- Pagination Helper for Settings Sections ---
  updateSettingsPaginationControls(type, totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / this.settingsItemsPerPage);
    const $prevBtn = $(`#${type}PrevPage`);
    const $nextBtn = $(`#${type}NextPage`);
    const $pageInfo = $(`#${type}PageInfo`);

    $pageInfo.text(`Page ${currentPage} of ${totalPages || 1}`);
    $prevBtn.prop("disabled", currentPage <= 1);
    $nextBtn.prop("disabled", currentPage >= totalPages);
  },

  // --- Helper to get status chip classes ---
  getStatusChipClasses(status) {
    const statusMap = {
      New: "status-new",
      Learning: "status-learning",
      Review: "status-review",
      Mastered: "status-mastered",
    };
    // Fallback to a default grey chip if status not found
    return `status-chip ${statusMap[status] || "status-default"}`;
  },

  // --- Vocabulary Section Logic ---
  renderVocabularies() {
    const searchTerm = $("#vocabSearch").val().toLowerCase();
    const categoryFilter = $("#vocabCategoryFilter").val();
    const statusFilter = $("#vocabStatusFilter").val(); // New: get status filter value

    let filteredVocab = this.data.vocabularies.filter((v) => {
      const matchesSearch =
        searchTerm === "" ||
        v.korean.toLowerCase().includes(searchTerm) ||
        v.english.toLowerCase().includes(searchTerm);
      const matchesCategory =
        categoryFilter === "" || v.category === categoryFilter;
      // New: filter by status
      const matchesStatus = statusFilter === "" || v.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus; // Combine all filters
    });

    const paginatedVocab = this.paginate(
      filteredVocab,
      this.vocabCurrentPage,
      this.itemsPerPage
    );
    const $vocabList = $("#vocabList");
    $vocabList.empty();

    if (paginatedVocab.length === 0) {
      $vocabList.append(
        '<tr><td colspan="6" class="text-center py-4 text-gray-500">No vocabulary found.</td></tr>'
      );
    } else {
      paginatedVocab.forEach((vocab) => {
        const statusClasses = this.getStatusChipClasses(vocab.status || "New");
        let resourcesHtml = "";
        // Ensure vocab.resource is an array before mapping and filter out empty strings
        const vocabResources = Array.isArray(vocab.resource)
          ? vocab.resource.filter((s) => s.trim() !== "")
          : [];

        vocabResources.forEach((res) => {
          const isUrl = res.startsWith("http://") || res.startsWith("https://");
          const tagClass = isUrl ? "resource-tag-url" : "";
          const icon = isUrl
            ? '<i class="fas fa-external-link-alt mr-1 text-sm"></i>'
            : "";
          const onClick = isUrl
            ? `onclick="window.open('${res}', '_blank')" style="cursor:pointer;"`
            : "";
          resourcesHtml += `<span class="resource-tag ${tagClass}" ${onClick}><span title="${res}">${icon}${res}</span></span>`; // Add title for full text on hover
        });
        // Don't display "N/A" if resourcesHtml is empty, just leave it blank

        $vocabList.append(`
                                    <tr class="hover:bg-gray-50 transition-colors duration-150">
                                        <td class="py-3 px-4 text-gray-700">${
                                          vocab.korean
                                        }</td>
                                        <td class="py-3 px-4 text-gray-700">${
                                          vocab.english
                                        }</td>
                                        <td class="py-3 px-4 text-gray-700">${
                                          vocab.category || "N/A"
                                        }</td>
                                        <td class="py-3 px-4 text-gray-700"><span class="${statusClasses}">${
          vocab.status || "New"
        }</span></td>
                                        <td class="py-3 px-4 text-gray-700">
                                            <div class="resource-cell-content">
                                                ${resourcesHtml}
                                            </div>
                                        </td>
                                        <td class="py-3 px-4 text-right">
                                            <div class="flex items-center space-x-2 justify-end">
                                                <button title="Ask AI" data-id="${
                                                  vocab.id
                                                }" class="ask-ai-btn text-blue-600 hover:text-blue-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-robot text-lg"></i>
                                                </button>
                                                <button title="Practice" data-id="${
                                                  vocab.id
                                                }" data-type="vocab" class="quick-practice-btn text-green-600 hover:text-green-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-keyboard text-lg"></i>
                                                </button>
                                                <button title="Edit" data-id="${
                                                  vocab.id
                                                }" class="edit-vocab-btn text-yellow-600 hover:text-yellow-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-edit text-lg"></i>
                                                </button>
                                                <button title="Delete" data-id="${
                                                  vocab.id
                                                }" class="delete-vocab-btn text-red-600 hover:text-red-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-trash text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `);
      });
    }
    this.updatePaginationControls("vocab", filteredVocab.length);
  },

  updatePaginationControls(type, totalItems) {
    const currentPage =
      type === "vocab" ? this.vocabCurrentPage : this.grammarCurrentPage;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const $prevBtn = $(`#${type}PrevPage`);
    const $nextBtn = $(`#${type}NextPage`);
    const $pageInfo = $(`#${type}PageInfo`);

    $pageInfo.text(`Page ${currentPage} of ${totalPages || 1}`);
    $prevBtn.prop("disabled", currentPage <= 1);
    $nextBtn.prop("disabled", currentPage >= totalPages);
  },

  openVocabModal(vocab = {}) {
    $("#dataModalTitle").text(
      vocab.id ? "Edit Vocabulary" : "Add New Vocabulary"
    );
    $("#koreanInput").val(vocab.korean || "");
    // Join array resources back to a comma-separated string for the input field
    $("#resourceInput").val(
      Array.isArray(vocab.resource)
        ? vocab.resource.join(", ")
        : vocab.resource || ""
    );
    $("#englishInput").val(vocab.english || "");

    const $categorySelect = $("#categorySelect");
    $categorySelect.empty();
    this.data.vocabCategories.forEach((cat) => {
      $categorySelect.append(`<option value="${cat}">${cat}</option>`);
    });
    if (vocab.category) {
      $categorySelect.val(vocab.category);
    } else if (this.data.vocabCategories.length === 0) {
      $categorySelect.append(
        `<option value="Uncategorized">Uncategorized</option>`
      );
      $categorySelect.val("Uncategorized");
    } else if (this.data.vocabCategories.length > 0) {
      $categorySelect.val(this.data.vocabCategories[0]);
    }

    const $statusSelect = $("#statusSelect");
    $statusSelect.empty();
    this.data.learningStatuses.forEach((status) => {
      $statusSelect.append(`<option value="${status}">${status}</option>`);
    });
    if (vocab.status) {
      $statusSelect.val(vocab.status);
    } else if (this.data.learningStatuses.length > 0) {
      $statusSelect.val(this.data.learningStatuses[0]); // Select first status by default
    } else {
      $statusSelect.append(`<option value="New">New</option>`); // Fallback if no statuses defined
      $statusSelect.val("New");
    }

    $("#dataForm").data("current-id", vocab.id || null);
    $("#dataForm").data("type", "vocab");
    this.showModal("dataModal");
  },

  saveVocab() {
    const id = $("#dataForm").data("current-id");
    const korean = $("#koreanInput").val().trim();
    const english = $("#englishInput").val().trim();
    const category = $("#categorySelect").val();
    const status = $("#statusSelect").val();
    // Split the resource input by comma and trim each part, filter out empty strings
    const resource = $("#resourceInput")
      .val()
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (!korean || !english) {
      this.showMessage(
        "Validation Error",
        "Korean and English fields cannot be empty."
      );
      return;
    }
    // Validate each URL in the resource array
    for (const res of resource) {
      if (res.startsWith("http://") || res.startsWith("https://")) {
        try {
          new URL(res); // Attempt to create a URL object to validate
        } catch (_) {
          this.showMessage(
            "Validation Error",
            `Invalid URL in resource: "${res}". Please ensure all URLs are valid.`
          );
          return;
        }
      }
    }

    if (id) {
      // Edit existing
      const index = this.data.vocabularies.findIndex((v) => v.id === id);
      if (index !== -1) {
        this.data.vocabularies[index] = {
          ...this.data.vocabularies[index],
          korean,
          english,
          category,
          status,
          resource,
        }; // Save resource as array
        this.showMessage("Success", "Vocabulary updated successfully!");
      }
    } else {
      // Add new
      this.data.vocabularies.push({
        id: crypto.randomUUID(),
        korean,
        english,
        category,
        status,
        resource,
      }); // Save resource as array
      this.showMessage("Success", "Vocabulary added successfully!");
    }
    this.saveData();
    this.renderVocabularies();
    this.closeModal("dataModal");
  },

  deleteVocab(id) {
    this.showMessage(
      "Confirm Delete",
      "Are you sure you want to delete this vocabulary item?",
      true,
      (confirmed) => {
        if (!confirmed) return;
        this.data.vocabularies = this.data.vocabularies.filter(
          (v) => v.id !== id
        );
        this.saveData();
        this.renderVocabularies();
        this.showMessage("Success", "Vocabulary deleted successfully!");
      }
    );
  },

  // --- Grammar Section Logic ---
  renderGrammars() {
    const searchTerm = $("#grammarSearch").val().toLowerCase();
    const categoryFilter = $("#grammarCategoryFilter").val();
    const statusFilter = $("#grammarStatusFilter").val(); // New: get status filter value

    let filteredGrammar = this.data.grammars.filter((g) => {
      const matchesSearch =
        searchTerm === "" ||
        g.korean.toLowerCase().includes(searchTerm) ||
        g.english.toLowerCase().includes(searchTerm);
      const matchesCategory =
        categoryFilter === "" || g.category === categoryFilter;
      // New: filter by status
      const matchesStatus = statusFilter === "" || g.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus; // Combine all filters
    });

    const paginatedGrammar = this.paginate(
      filteredGrammar,
      this.grammarCurrentPage,
      this.itemsPerPage
    );
    const $grammarList = $("#grammarList");
    $grammarList.empty();

    if (paginatedGrammar.length === 0) {
      $grammarList.append(
        '<tr><td colspan="6" class="text-center py-4 text-gray-500">No grammar found.</td></tr>'
      );
    } else {
      paginatedGrammar.forEach((grammar) => {
        const statusClasses = this.getStatusChipClasses(
          grammar.status || "New"
        );
        let resourcesHtml = "";
        // Ensure grammar.resource is an array before mapping and filter out empty strings
        const grammarResources = Array.isArray(grammar.resource)
          ? grammar.resource.filter((s) => s.trim() !== "")
          : [];

        grammarResources.forEach((res) => {
          const isUrl = res.startsWith("http://") || res.startsWith("https://");
          const tagClass = isUrl ? "resource-tag-url" : "";
          const icon = isUrl
            ? '<i class="fas fa-external-link-alt mr-1 text-sm"></i>'
            : "";
          const onClick = isUrl
            ? `onclick="window.open('${res}', '_blank')" style="cursor:pointer;"`
            : "";
          resourcesHtml += `<span class="resource-tag ${tagClass}" ${onClick}><span title="${res}">${icon}${res}</span></span>`; // Add title for full text on hover
        });
        // Don't display "N/A" if resourcesHtml is empty, just leave it blank
        $grammarList.append(`
                                    <tr class="hover:bg-gray-50 transition-colors duration-150">
                                        <td class="py-3 px-4 text-gray-700">${
                                          grammar.korean
                                        }</td>
                                        <td class="py-3 px-4 text-gray-700">${
                                          grammar.english
                                        }</td>
                                        <td class="py-3 px-4 text-gray-700">${
                                          grammar.category || "N/A"
                                        }</td>
                                        <td class="py-3 px-4 text-gray-700"><span class="${statusClasses}">${
          grammar.status || "New"
        }</span></td>
                                        <td class="py-3 px-4 text-gray-700">
                                            <div class="resource-cell-content">
                                                ${resourcesHtml}
                                            </div>
                                        </td>
                                        <td class="py-3 px-4 text-right">
                                            <div class="flex items-center space-x-2 justify-end">
                                                <button title="Ask AI" data-id="${
                                                  grammar.id
                                                }" class="ask-ai-btn text-blue-600 hover:text-blue-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-robot text-lg"></i>
                                                </button>
                                                <button title="Practice" data-id="${
                                                  grammar.id
                                                }" data-type="grammar" class="quick-practice-btn text-green-600 hover:text-green-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-keyboard text-lg"></i>
                                                </button>
                                                <button title="Edit" data-id="${
                                                  grammar.id
                                                }" class="edit-grammar-btn text-yellow-600 hover:text-yellow-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-edit text-lg"></i>
                                                </button>
                                                <button title="Delete" data-id="${
                                                  grammar.id
                                                }" class="delete-grammar-btn text-red-600 hover:text-red-800 p-1 rounded-full transition-colors duration-200">
                                                    <i class="fas fa-trash text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `);
      });
    }
    this.updatePaginationControls("grammar", filteredGrammar.length);
  },

  openGrammarModal(grammar = {}) {
    $("#dataModalTitle").text(grammar.id ? "Edit Grammar" : "Add New Grammar");
    $("#koreanInput").val(grammar.korean || "");
    $("#englishInput").val(grammar.english || "");
    // Join array resources back to a comma-separated string for the input field
    $("#resourceInput").val(
      Array.isArray(grammar.resource)
        ? grammar.resource.join(", ")
        : grammar.resource || ""
    );

    const $categorySelect = $("#categorySelect");
    $categorySelect.empty();
    this.data.grammarCategories.forEach((cat) => {
      $categorySelect.append(`<option value="${cat}">${cat}</option>`);
    });
    if (grammar.category) {
      $categorySelect.val(grammar.category);
    } else if (this.data.grammarCategories.length === 0) {
      $categorySelect.append(
        `<option value="Uncategorized">Uncategorized</option>`
      );
      $categorySelect.val("Uncategorized");
    } else if (this.data.grammarCategories.length > 0) {
      $categorySelect.val(this.data.grammarCategories[0]);
    }

    const $statusSelect = $("#statusSelect");
    $statusSelect.empty();
    this.data.learningStatuses.forEach((status) => {
      $statusSelect.append(`<option value="${status}">${status}</option>`);
    });
    if (grammar.status) {
      $statusSelect.val(grammar.status);
    } else if (this.data.learningStatuses.length > 0) {
      $statusSelect.val(this.data.learningStatuses[0]);
    } else {
      $statusSelect.append(`<option value="New">New</option>`);
      $statusSelect.val("New");
    }

    $("#dataForm").data("current-id", grammar.id || null);
    $("#dataForm").data("type", "grammar");
    this.showModal("dataModal");
  },

  saveGrammar() {
    const id = $("#dataForm").data("current-id");
    const korean = $("#koreanInput").val().trim();
    const english = $("#englishInput").val().trim();
    const category = $("#categorySelect").val();
    const status = $("#statusSelect").val();
    // Split the resource input by comma and trim each part, filter out empty strings
    const resource = $("#resourceInput")
      .val()
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (!korean || !english) {
      this.showMessage(
        "Validation Error",
        "Korean and English fields cannot be empty."
      );
      return;
    }
    // Validate each URL in the resource array
    for (const res of resource) {
      if (res.startsWith("http://") || res.startsWith("https://")) {
        try {
          new URL(res); // Attempt to create a URL object to validate
        } catch (_) {
          this.showMessage(
            "Validation Error",
            `Invalid URL in resource: "${res}". Please ensure all URLs are valid.`
          );
          return;
        }
      }
    }

    if (id) {
      // Edit existing
      const index = this.data.grammars.findIndex((g) => g.id === id);
      if (index !== -1) {
        this.data.grammars[index] = {
          ...this.data.grammars[index],
          korean,
          english,
          category,
          status,
          resource,
        }; // Save resource as array
        this.showMessage("Success", "Grammar updated successfully!");
      }
    } else {
      // Add new
      this.data.grammars.push({
        id: crypto.randomUUID(),
        korean,
        english,
        category,
        status,
        resource,
      }); // Save resource as array
      this.showMessage("Success", "Grammar added successfully!");
    }
    this.saveData();
    this.renderGrammars();
    this.closeModal("dataModal");
  },

  deleteGrammar(id) {
    this.showMessage(
      "Confirm Delete",
      "Are you sure you want to delete this grammar item?",
      true,
      (confirmed) => {
        if (!confirmed) return;
        this.data.grammars = this.data.grammars.filter((g) => g.id !== id);
        this.saveData();
        this.renderGrammars();
        this.showMessage("Success", "Grammar deleted successfully!");
      }
    );
  },

  // --- Gemini API Integration ---
  async getGeminiExplanation(query, type) {
    if (!this.data.geminiApiKey) {
      this.showMessage(
        "API Key Missing",
        "Please set your Gemini API Key in the Settings section to use this feature."
      );
      return;
    }

    $("#aiModalContent").html(
      '<p class="text-center"><i class="fas fa-spinner fa-spin mr-2"></i> Generating explanation...</p>'
    );
    this.showModal("aiModal");

    let prompt;
    if (type === "vocabulary") {
      prompt = `Provide a simple explanation and 3 example sentences in Korean with English translations for the Korean word "${query}". The explanation should be suitable for a beginner Korean learner.`;
    } else if (type === "grammar") {
      prompt = `Explain the Korean grammar pattern "${query}" simply. Include its usage rules, common contexts, and 3 example sentences in Korean with English translations. The explanation should be suitable for a beginner Korean learner.`;
    } else {
      prompt = `Explain "${query}" in Korean with examples.`;
    }

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = this.data.geminiApiKey; // Use the stored API key
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (
        response.ok &&
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text;
        $("#aiModalContent").html(text.replace(/\n/g, "<br>")); // Display newlines as breaks
      } else {
        $("#aiModalContent").html(
          '<p class="text-red-600">Failed to get explanation from AI. Please try again or check your API key.</p>'
        );
        console.error("Gemini API returned unexpected response:", result);
      }
    } catch (error) {
      $("#aiModalContent").html(
        '<p class="text-red-600">An error occurred while connecting to the AI. Please check your internet connection or API key.</p>'
      );
      console.error("Error calling Gemini API:", error);
    }
  },

  displayApiKey() {
    const apiKey = this.data.geminiApiKey;
    const $input = $("#geminiApiKeyInput");
    const $status = $("#apiKeyStatus");
    if (apiKey) {
      $input.val(apiKey);
      $status
        .text("API Key loaded (hidden for security).")
        .removeClass("text-red-600")
        .addClass("text-green-600");
    } else {
      $input.val("");
      $status
        .text("No API Key set.")
        .removeClass("text-green-600")
        .addClass("text-red-600");
    }
  },

  saveApiKey() {
    const newKey = $("#geminiApiKeyInput").val().trim();
    if (newKey) {
      this.data.geminiApiKey = newKey;
      this.saveData();
      this.showMessage("Success", "API Key saved successfully!");
      this.displayApiKey();
    } else {
      this.showMessage("Warning", "API Key cannot be empty.");
    }
  },

  async testApiKey() {
    if (!this.data.geminiApiKey) {
      this.showMessage("API Key Missing", "Please enter an API Key first.");
      return;
    }
    const $status = $("#apiKeyStatus");
    $status
      .text("Testing API Key...")
      .removeClass("text-green-600 text-red-600")
      .addClass("text-gray-600");

    try {
      const testPrompt = "Say hello in Korean.";
      let chatHistory = [{ role: "user", parts: [{ text: testPrompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = this.data.geminiApiKey;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok && result.candidates && result.candidates.length > 0) {
        $status
          .text("API Key is valid!")
          .removeClass("text-red-600 text-gray-600")
          .addClass("text-green-600");
        this.showMessage(
          "API Key Test",
          "API Key is valid and successfully connected to Gemini API."
        );
      } else {
        $status
          .text("API Key Invalid or Error.")
          .removeClass("text-green-600 text-gray-600")
          .addClass("text-red-600");
        this.showMessage(
          "API Key Test Failed",
          `API Key is invalid or an error occurred. Response: ${JSON.stringify(
            result.error || result
          )}`
        );
      }
    } catch (error) {
      $status
        .text("API Key Test Failed: Network Error.")
        .removeClass("text-green-600 text-gray-600")
        .addClass("text-red-600");
      this.showMessage(
        "API Key Test Failed",
        `Network error during API test: ${error.message}. Check console for details.`
      );
      console.error("API Test Network Error:", error);
    }
  },

  // --- Data Import/Export/Clear ---
  exportData() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "korean_learning_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showMessage(
      "Success",
      "Data exported successfully as korean_learning_data.json!"
    );
  },

  downloadSampleData() {
    const sampleData = {
      vocabularies: [
        {
          id: crypto.randomUUID(),
          korean: "안녕하세요",
          english: "Hello",
          category: "Basic Greetings",
          status: "New",
          resource: ["https://www.youtube.com/watch?v=hello_korean"],
        },
        {
          id: crypto.randomUUID(),
          korean: "감사합니다",
          english: "Thank you",
          category: "Basic Greetings",
          status: "Learning",
          resource: ["TTMIK Lesson 1", "My notes on politeness"],
        },
      ],
      grammars: [
        {
          id: crypto.randomUUID(),
          korean: "-(으)세요",
          english: "Please do (honorific)",
          category: "Basic Endings",
          status: "New",
          resource: ["https://koreanly.com/grammar/euseyo", "Workbook pg 12"],
        },
        {
          id: crypto.randomUUID(),
          korean: "-고 싶다",
          english: "To want to",
          category: "Desire Expressions",
          status: "Learning",
          resource: ["Grammar explanation video"],
        },
      ],
      vocabCategories: [
        "Basic Greetings",
        "Food",
        "Places",
        "Actions",
        "Emotions",
        "Numbers",
      ],
      grammarCategories: [
        "Basic Endings",
        "Conjunctions",
        "Honorifics",
        "Tenses",
        "Desire Expressions",
      ],
      learningStatuses: ["New", "Learning", "Review", "Mastered"],
      geminiApiKey: "", // Sample data does not include an API key
    };
    const dataStr = JSON.stringify(sampleData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "korean_learning_sample.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showMessage(
      "Success",
      "Sample data downloaded as korean_learning_sample.json!"
    );
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Prompt user to append or replace
        this.showModal(
          "messageModal",
          "Import Data",
          "Do you want to append this data to your existing data or replace all your current data?",
          true,
          (confirmed) => {
            if (confirmed === true) {
              // User chose 'Append' (first button)
              // Append logic
              importedData.vocabularies.forEach((newItem) => {
                // Check if item with same ID exists, if so, update; otherwise, add new
                const existingIndex = this.data.vocabularies.findIndex(
                  (item) => item.id === newItem.id
                );
                if (existingIndex !== -1) {
                  this.data.vocabularies[existingIndex] = newItem; // Overwrite existing
                } else {
                  this.data.vocabularies.push(newItem); // Add new
                }
              });
              importedData.grammars.forEach((newItem) => {
                const existingIndex = this.data.grammars.findIndex(
                  (item) => item.id === newItem.id
                );
                if (existingIndex !== -1) {
                  this.data.grammars[existingIndex] = newItem;
                } else {
                  this.data.grammars.push(newItem);
                }
              });

              // Merge categories and statuses (only add new unique ones)
              this.data.vocabCategories = [
                ...new Set([
                  ...this.data.vocabCategories,
                  ...(importedData.vocabCategories || []),
                ]),
              ].sort();
              this.data.grammarCategories = [
                ...new Set([
                  ...this.data.grammarCategories,
                  ...(importedData.grammarCategories || []),
                ]),
              ].sort();
              this.data.learningStatuses = [
                ...new Set([
                  ...this.data.learningStatuses,
                  ...(importedData.learningStatuses || []),
                ]),
              ].sort();

              this.saveData();
              this.loadData(); // Reload to refresh UI and ensure resource array conversion
              this.renderVocabularies();
              this.renderGrammars();
              this.renderCategories();
              this.renderStatuses();
              this.displayApiKey();
              this.showMessage("Success", "Data appended successfully!");
            } else if (confirmed === false) {
              // User chose 'Cancel' (second button, for replace)
              // Replace logic
              if (
                importedData.vocabularies &&
                importedData.grammars &&
                importedData.vocabCategories &&
                importedData.grammarCategories
              ) {
                this.data = {
                  vocabularies: importedData.vocabularies || [],
                  grammars: importedData.grammars || [],
                  vocabCategories: importedData.vocabCategories || [
                    "Basic Greetings",
                    "Food",
                    "Places",
                    "Actions",
                  ],
                  grammarCategories: importedData.grammarCategories || [
                    "Basic Endings",
                    "Conjunctions",
                    "Honorifics",
                    "Tenses",
                  ],
                  learningStatuses: importedData.learningStatuses || [
                    "New",
                    "Learning",
                    "Review",
                    "Mastered",
                  ],
                  geminiApiKey: importedData.geminiApiKey || "",
                };
                this.saveData();
                this.loadData(); // Reload to refresh UI (handles resource format conversion now)
                this.renderVocabularies();
                this.renderGrammars();
                this.renderCategories();
                this.renderStatuses();
                this.displayApiKey();
                this.showMessage("Success", "Data replaced successfully!");
              } else {
                this.showMessage(
                  "Import Error",
                  "Invalid data format. Please select a valid .json file from this app."
                );
              }
            }
            // Clear the file input after processing
            $("#importFileInput").val("");
          }
        );

        // Dynamically change message modal buttons for import choice
        $("#confirmMessageModalBtn").text("Append Data");
        $("#cancelMessageModalBtn").text("Replace All Data"); // This button acts as 'replace'
        $("#closeMessageModalBtn").addClass("hidden"); // Hide default OK
      } catch (error) {
        this.showMessage(
          "Import Error",
          "Failed to parse JSON file. Please ensure it's a valid JSON format."
        );
        console.error("Error importing data:", error);
        $("#importFileInput").val(""); // Clear the file input
      }
    };
    reader.readAsText(file);
  },

  clearAllData() {
    this.showMessage(
      "Confirm Clear",
      "Are you sure you want to clear ALL data? This action cannot be undone.",
      true,
      (confirmed) => {
        if (!confirmed) return;
        this.data = {
          // Reset to initial empty state with default categories and statuses
          vocabularies: [],
          grammars: [],
          vocabCategories: ["Basic Greetings", "Food", "Places", "Actions"],
          grammarCategories: [
            "Basic Endings",
            "Conjunctions",
            "Honorifics",
            "Tenses",
          ],
          learningStatuses: ["New", "Learning", "Review", "Mastered"],
          geminiApiKey: "",
        };
        this.saveData();
        this.loadData(); // Reload to refresh UI
        this.renderVocabularies();
        this.renderGrammars();
        this.renderCategories();
        this.renderStatuses(); // Re-render statuses
        this.showMessage("Success", "All data cleared successfully!");
      }
    );
  },

  // --- Review & Quiz Logic ---
  hideQuizAndFlashcards() {
    $("#flashcardContainer").addClass("hidden");
    $("#quizContainer").addClass("hidden");
    $("#startFlashcardsBtn").removeClass("hidden");
    $("#startQuizBtn").removeClass("hidden");
  },

  startFlashcards() {
    if (
      this.data.vocabularies.length === 0 &&
      this.data.grammars.length === 0
    ) {
      this.showMessage(
        "No Data",
        "Please add some Vocabulary or Grammar items first to start flashcards."
      );
      return;
    }
    this.hideQuizAndFlashcards();
    $("#flashcardContainer").removeClass("hidden");
    this.quiz.allWords = [
      ...this.data.vocabularies,
      ...this.data.grammars,
    ].sort(() => 0.5 - Math.random()); // Shuffle
    this.quiz.currentQuestionIndex = 0;
    this.showNextFlashcard();
  },

  showNextFlashcard() {
    if (this.quiz.currentQuestionIndex >= this.quiz.allWords.length) {
      this.showMessage(
        "Flashcards Done!",
        "You've gone through all the flashcards. Restarting from the beginning!"
      );
      this.quiz.currentQuestionIndex = 0; // Loop back to start
      this.quiz.allWords.sort(() => 0.5 - Math.random()); // Reshuffle
    }

    const currentItem = this.quiz.allWords[this.quiz.currentQuestionIndex];
    const $flashcard = $("#flashcard");
    const $content = $("#flashcardContent");
    const $side = $("#flashcardSide");

    $content.text(currentItem.korean);
    $flashcard.data("korean", currentItem.korean);
    $flashcard.data("english", currentItem.english);
    $flashcard.data("flipped", false);
    $side.text("Korean");
    $flashcard
      .removeClass("bg-blue-500 text-white")
      .addClass("bg-white text-gray-800 border-blue-400"); // Reset styling
  },

  flipFlashcard() {
    const $flashcard = $("#flashcard");
    const $content = $("#flashcardContent");
    const $side = $("#flashcardSide");
    const isFlipped = $flashcard.data("flipped");

    if (!isFlipped) {
      $content.text($flashcard.data("english"));
      $side.text("English");
      $flashcard.data("flipped", true);
      $flashcard
        .removeClass("bg-white text-gray-800 border-blue-400")
        .addClass("bg-blue-500 text-white"); // Add flipped styling
    } else {
      $content.text($flashcard.data("korean"));
      $side.text("Korean");
      $flashcard.data("flipped", false);
      $flashcard
        .removeClass("bg-blue-500 text-white")
        .addClass("bg-white text-gray-800 border-blue-400"); // Remove flipped styling
    }
  },

  startQuiz() {
    this.quiz.allWords = [...this.data.vocabularies, ...this.data.grammars];
    if (this.quiz.allWords.length < 4) {
      this.showMessage(
        "Not Enough Data",
        "You need at least 4 vocabulary/grammar items to start a quiz."
      );
      return;
    }

    this.hideQuizAndFlashcards();
    $("#quizContainer").removeClass("hidden");
    this.quiz.score = 0;
    this.quiz.currentQuestionIndex = 0;
    this.generateQuizQuestions();
    this.showNextQuizQuestion();
  },

  generateQuizQuestions() {
    const allItems = [...this.data.vocabularies, ...this.data.grammars];
    this.quiz.questions = [];

    if (allItems.length < 4) {
      return; // Not enough items to create questions
    }

    // Shuffle items to get random questions
    const shuffledItems = allItems.sort(() => 0.5 - Math.random());

    // Generate questions (e.g., 10 questions or all if less than 10)
    const numQuestions = Math.min(shuffledItems.length, 10);

    for (let i = 0; i < numQuestions; i++) {
      const correctItem = shuffledItems[i];
      let options = [correctItem.english];

      // Generate 3 incorrect options
      while (options.length < 4) {
        const randomItem =
          allItems[Math.floor(Math.random() * allItems.length)];
        if (
          randomItem.english !== correctItem.english &&
          !options.includes(randomItem.english)
        ) {
          options.push(randomItem.english);
        }
      }
      options.sort(() => 0.5 - Math.random()); // Shuffle options

      this.quiz.questions.push({
        korean: correctItem.korean,
        correctAnswer: correctItem.english,
        options: options,
      });
    }
    $("#quizTotalQuestions").text(this.quiz.questions.length);
  },

  showNextQuizQuestion() {
    if (this.quiz.currentQuestionIndex >= this.quiz.questions.length) {
      this.endQuiz();
      return;
    }

    const question = this.quiz.questions[this.quiz.currentQuestionIndex];
    $("#quizQuestion").text(
      `What is the English meaning of "${question.korean}"?`
    );
    $("#quizScore").text(this.quiz.score);
    $("#quizCurrentQuestion").text(this.quiz.currentQuestionIndex + 1);

    const $optionsContainer = $("#quizOptions");
    $optionsContainer.empty();
    question.options.forEach((option) => {
      $optionsContainer.append(`
                                <button class="quiz-option-button bg-gray-200 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-300 transition duration-300 w-full text-left font-medium shadow-sm" data-answer="${option}">
                                    ${option}
                                </button>
                            `);
    });

    $(".quiz-option-button")
      .removeClass("correct incorrect")
      .prop("disabled", false); // Reset button states
    $("#nextQuizQuestionBtn").addClass("hidden");
    $("#restartQuizBtn").addClass("hidden");
  },

  checkQuizAnswer(selectedAnswer) {
    const question = this.quiz.questions[this.quiz.currentQuestionIndex];
    const $options = $(".quiz-option-button");
    $options.prop("disabled", true); // Disable all options after selection

    if (selectedAnswer === question.correctAnswer) {
      this.quiz.score++;
      $(`button[data-answer="${selectedAnswer}"]`).addClass("correct");
    } else {
      $(`button[data-answer="${selectedAnswer}"]`).addClass("incorrect");
      $(`button[data-answer="${question.correctAnswer}"]`).addClass("correct"); // Highlight correct answer
    }
    $("#quizScore").text(this.quiz.score);
    $("#nextQuizQuestionBtn").removeClass("hidden"); // Show next question button
  },

  endQuiz() {
    $("#quizQuestion").text("Quiz Completed!");
    $("#quizOptions")
      .empty()
      .append(
        `<p class="text-xl font-bold text-center">Your final score: ${this.quiz.score} out of ${this.quiz.questions.length}</p>`
      );
    $("#nextQuizQuestionBtn").addClass("hidden");
    $("#restartQuizBtn").removeClass("hidden");
  },

  // --- Quick Practice Logic ---
  openPracticeModal(item, type) {
    $("#practiceModal").data("correct-answer", item.english);
    $("#practiceModal").data("item-korean", item.korean);
    $("#practiceKorean").text(item.korean);
    $("#practiceAnswerInput")
      .val("")
      .removeClass("border-red-500 border-green-500")
      .prop("disabled", false)
      .focus(); // Clear and enable input, set focus
    $("#practiceFeedback").text("").removeClass("text-red-600 text-green-600");
    $("#checkPracticeAnswerBtn").removeClass("hidden");
    this.showModal("practiceModal");
  },

  checkPracticeAnswer() {
    const userAnswer = $("#practiceAnswerInput").val().trim();
    const correctAnswer = $("#practiceModal").data("correct-answer");
    const $feedback = $("#practiceFeedback");
    const $input = $("#practiceAnswerInput");

    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
      $feedback.text("Correct! 🎉").addClass("text-green-600");
      $input.removeClass("border-red-500").addClass("border-green-500");
      $("#checkPracticeAnswerBtn").addClass("hidden");
    } else {
      $feedback
        .html(
          `Incorrect. The correct answer is: <span class="font-bold">${correctAnswer}</span>`
        )
        .addClass("text-red-600");
      $input.removeClass("border-green-500").addClass("border-red-500");
    }
    $input.prop("disabled", true);
  },

  // --- Guide Modal Logic ---
  showGuideModal() {
    this.showModal("guideModal");
    // Ensure initial tab is active
    $("#guideModal .tab-button")
      .removeClass("active-tab-button border-blue-600")
      .addClass("border-transparent");
    $("#guideModal .tab-content")
      .addClass("hidden")
      .removeClass("active-tab-content");
    $('#guideModal .tab-button[data-tab="about"]').addClass(
      "active-tab-button border-blue-600"
    );
    $("#aboutTab").addClass("active-tab-content").removeClass("hidden");
  },
  switchGuideTab(tabName) {
    $("#guideModal .tab-button")
      .removeClass("active-tab-button border-blue-600")
      .addClass("border-transparent");
    $("#guideModal .tab-content")
      .addClass("hidden")
      .removeClass("active-tab-content");

    $(`#guideModal .tab-button[data-tab="${tabName}"]`).addClass(
      "active-tab-button border-blue-600"
    );
    $(`#${tabName}Tab`).addClass("active-tab-content").removeClass("hidden");
  },

  // --- Event Listeners ---
  addEventListeners() {
    // Navigation
    $(".nav-link").on("click", function (e) {
      e.preventDefault();
      app.showSection($(this).data("section"));
    });

    // Vocabulary
    $("#vocabSearch").on(
      "keyup",
      $.debounce(300, () => app.renderVocabularies())
    );
    $("#vocabCategoryFilter").on("change", () => app.renderVocabularies());
    $("#vocabStatusFilter").on("change", () => app.renderVocabularies()); // New: Status filter event
    $("#addVocabBtn").on("click", () => app.openVocabModal());
    $(document).on("click", ".edit-vocab-btn", function () {
      const id = $(this).data("id");
      const vocab = app.data.vocabularies.find((v) => v.id === id);
      if (vocab) app.openVocabModal(vocab);
    });
    $(document).on("click", ".delete-vocab-btn", function () {
      app.deleteVocab($(this).data("id"));
    });
    $("#vocabPrevPage").on("click", () => {
      if (app.vocabCurrentPage > 1) {
        app.vocabCurrentPage--;
        app.renderVocabularies();
      }
    });
    $("#vocabNextPage").on("click", () => {
      const searchTerm = $("#vocabSearch").val().toLowerCase();
      const categoryFilter = $("#vocabCategoryFilter").val();
      const statusFilter = $("#vocabStatusFilter").val();
      const totalItems = app.data.vocabularies.filter((v) => {
        const matchesSearch =
          searchTerm === "" ||
          v.korean.toLowerCase().includes(searchTerm) ||
          v.english.toLowerCase().includes(searchTerm);
        const matchesCategory =
          categoryFilter === "" || v.category === categoryFilter;
        const matchesStatus = statusFilter === "" || v.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      }).length;
      const totalPages = Math.ceil(totalItems / app.itemsPerPage);
      if (app.vocabCurrentPage < totalPages) {
        app.vocabCurrentPage++;
        app.renderVocabularies();
      }
    });

    // Grammar
    $("#grammarSearch").on(
      "keyup",
      $.debounce(300, () => app.renderGrammars())
    );
    $("#grammarCategoryFilter").on("change", () => app.renderGrammars());
    $("#grammarStatusFilter").on("change", () => app.renderGrammars()); // New: Status filter event
    $("#addGrammarBtn").on("click", () => app.openGrammarModal());
    $(document).on("click", ".edit-grammar-btn", function () {
      const id = $(this).data("id");
      const grammar = app.data.grammars.find((g) => g.id === id);
      if (grammar) app.openGrammarModal(grammar);
    });
    $(document).on("click", ".delete-grammar-btn", function () {
      app.deleteGrammar($(this).data("id"));
    });
    $("#grammarPrevPage").on("click", () => {
      if (app.grammarCurrentPage > 1) {
        app.grammarCurrentPage--;
        app.renderGrammars();
      }
    });
    $("#grammarNextPage").on("click", () => {
      const searchTerm = $("#grammarSearch").val().toLowerCase();
      const categoryFilter = $("#grammarCategoryFilter").val();
      const statusFilter = $("#grammarStatusFilter").val();
      const totalItems = app.data.grammars.filter((g) => {
        const matchesSearch =
          searchTerm === "" ||
          g.korean.toLowerCase().includes(searchTerm) ||
          g.english.toLowerCase().includes(searchTerm);
        const matchesCategory =
          categoryFilter === "" || g.category === categoryFilter;
        const matchesStatus = statusFilter === "" || g.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      }).length;
      const totalPages = Math.ceil(totalItems / app.itemsPerPage);
      if (app.grammarCurrentPage < totalPages) {
        app.grammarCurrentPage++;
        app.renderGrammars();
      }
    });

    // Data Modal Save/Cancel
    $("#dataForm").on("submit", function (e) {
      e.preventDefault();
      const type = $(this).data("type");
      if (type === "vocab") app.saveVocab();
      else if (type === "grammar") app.saveGrammar();
    });
    $("#cancelDataModalBtn").on("click", () => app.closeModal("dataModal"));

    // AI Explanation
    $(document).on("click", ".ask-ai-btn", function () {
      const id = $(this).data("id");
      let item;
      let type;
      item = app.data.vocabularies.find((v) => v.id === id);
      if (item) {
        type = "vocabulary";
      } else {
        item = app.data.grammars.find((g) => g.id === id);
        if (item) {
          type = "grammar";
        }
      }

      if (item) {
        app.getGeminiExplanation(item.korean, type);
      } else {
        app.showMessage("Error", "Item not found for AI explanation.");
      }
    });
    $("#closeAiModalBtn").on("click", () => app.closeModal("aiModal"));

    // Settings - Categories
    $("#addVocabCategoryBtn").on("click", () =>
      app.addCategory("vocab", $("#newVocabCategoryInput").val().trim())
    );
    $("#addGrammarCategoryBtn").on("click", () =>
      app.addCategory("grammar", $("#newGrammarCategoryInput").val().trim())
    );
    $(document).on("click", ".delete-category-btn", function () {
      app.deleteCategory($(this).data("type"), $(this).data("category"));
    });
    $("#vocabCategoryPrevPage").on("click", () => {
      if (app.vocabCategoryCurrentPage > 1) {
        app.vocabCategoryCurrentPage--;
        app.renderCategories();
      }
    });
    $("#vocabCategoryNextPage").on("click", () => {
      const totalPages = Math.ceil(
        app.data.vocabCategories.length / app.settingsItemsPerPage
      );
      if (app.vocabCategoryCurrentPage < totalPages) {
        app.vocabCategoryCurrentPage++;
        app.renderCategories();
      }
    });
    $("#grammarCategoryPrevPage").on("click", () => {
      if (app.grammarCategoryCurrentPage > 1) {
        app.grammarCategoryCurrentPage--;
        app.renderCategories();
      }
    });
    $("#grammarCategoryNextPage").on("click", () => {
      const totalPages = Math.ceil(
        app.data.grammarCategories.length / app.settingsItemsPerPage
      );
      if (app.grammarCategoryCurrentPage < totalPages) {
        app.grammarCategoryCurrentPage++;
        app.renderCategories();
      }
    });

    // Settings - Statuses
    $("#addStatusBtn").on("click", () =>
      app.addStatus($("#newStatusInput").val().trim())
    );
    $(document).on("click", ".delete-status-btn", function () {
      app.deleteStatus($(this).data("status"));
    });
    $("#statusPrevPage").on("click", () => {
      if (app.statusCurrentPage > 1) {
        app.statusCurrentPage--;
        app.renderStatuses();
      }
    });
    $("#statusNextPage").on("click", () => {
      const totalPages = Math.ceil(
        app.data.learningStatuses.length / app.settingsItemsPerPage
      );
      if (app.statusCurrentPage < totalPages) {
        app.statusCurrentPage++;
        app.renderStatuses();
      }
    });

    // Settings - Data Management
    $("#exportDataBtn").on("click", () => app.exportData());
    $("#downloadSampleDataBtn").on("click", () => app.downloadSampleData()); // New sample download button
    $("#importFileInput").on("change", (e) => app.importData(e));
    $("#clearDataBtn").on("click", () => app.clearAllData());

    // Settings - API Key
    $("#saveApiKeyBtn").on("click", () => app.saveApiKey());
    $("#testApiKeyBtn").on("click", () => app.testApiKey());

    // Review & Quiz
    $("#startFlashcardsBtn").on("click", () => app.startFlashcards());
    $("#flashcard").on("click", () => app.flipFlashcard());
    $("#nextFlashcardBtn").on("click", () => {
      app.quiz.currentQuestionIndex++;
      app.showNextFlashcard();
    });
    $("#startQuizBtn").on("click", () => app.startQuiz());
    $(document).on("click", ".quiz-option-button", function () {
      app.checkQuizAnswer($(this).data("answer"));
    });
    $("#nextQuizQuestionBtn").on("click", () => {
      app.quiz.currentQuestionIndex++;
      app.showNextQuizQuestion();
    });
    $("#restartQuizBtn").on("click", () => app.startQuiz());

    // Quick Practice
    $(document).on("click", ".quick-practice-btn", function () {
      const id = $(this).data("id");
      const type = $(this).data("type");
      let item;
      if (type === "vocab") {
        item = app.data.vocabularies.find((v) => v.id === id);
      } else if (type === "grammar") {
        item = app.data.grammars.find((g) => g.id === id);
      }

      if (item) {
        app.openPracticeModal(item, type);
      } else {
        app.showMessage("Error", "Practice item not found.");
      }
    });
    $("#checkPracticeAnswerBtn").on("click", () => app.checkPracticeAnswer());
    $("#practiceAnswerInput").on("keypress", function (e) {
      if (e.which === 13) {
        // Enter key
        e.preventDefault();
        if (!$(this).prop("disabled")) {
          // Only check if not disabled
          app.checkPracticeAnswer();
        }
      }
    });
    $("#closePracticeModalBtn").on("click", () =>
      app.closeModal("practiceModal")
    );

    // Guide Button and Modal
    $("#guideFab").on("click", () => app.showGuideModal());
    $("#closeGuideModalBtn").on("click", () => app.closeModal("guideModal"));
    $("#guideModal .tab-button").on("click", function () {
      app.switchGuideTab($(this).data("tab"));
    });
  },

  // --- Initialization ---
  init() {
    this.loadData();
    this.addEventListeners();
    this.showSection(this.currentSection); // Show initial section (vocabulary)
    // Add some initial dummy data if storage is empty for demonstration
    if (this.data.vocabularies.length === 0) {
      this.data.vocabularies.push(
        {
          id: crypto.randomUUID(),
          korean: "안녕하세요",
          english: "Hello",
          category: "Basic Greetings",
          status: "New",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "감사합니다",
          english: "Thank you",
          category: "Basic Greetings",
          status: "Learning",
          resource: [
            "https://www.youtube.com/watch?v=tutorial_thank_you",
            "TTMIK Lesson",
          ],
        },
        {
          id: crypto.randomUUID(),
          korean: "미안합니다",
          english: "I am sorry",
          category: "Basic Greetings",
          status: "Review",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "네",
          english: "Yes",
          category: "Basic Greetings",
          status: "Mastered",
          resource: ["More notes on 'Ne'", "https://www.duolingo.com"],
        },
        {
          id: crypto.randomUUID(),
          korean: "아니요",
          english: "No",
          category: "Basic Greetings",
          status: "New",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "사랑",
          english: "Love",
          category: "Emotions",
          status: "Learning",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "행복",
          english: "Happiness",
          category: "Emotions",
          status: "Review",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "물",
          english: "Water",
          category: "Food",
          status: "Mastered",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "밥",
          english: "Rice / Meal",
          category: "Food",
          status: "New",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "학교",
          english: "School",
          category: "Places",
          status: "Learning",
          resource: [],
        }
      );
    }
    if (this.data.grammars.length === 0) {
      this.data.grammars.push(
        {
          id: crypto.randomUUID(),
          korean: "-(으)세요",
          english: "Please do (honorific)",
          category: "Basic Endings",
          status: "New",
          resource: ["https://koreanly.com/grammar/euseyo"],
        },
        {
          id: crypto.randomUUID(),
          korean: "-고 싶다",
          english: "To want to",
          category: "Desire Expressions",
          status: "Learning",
          resource: ["Lesson 5", "https://example.com/want-to"],
        },
        {
          id: crypto.randomUUID(),
          korean: "-습니다 / -ㅂ니다",
          english: "Formal ending (declarative)",
          category: "Basic Endings",
          status: "Review",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "-아/어/여요",
          english: "Informal polite ending",
          category: "Basic Endings",
          status: "Mastered",
          resource: ["More details on informal polite"],
        },
        {
          id: crypto.randomUUID(),
          korean: "그리고",
          english: "And (connective)",
          category: "Conjunctions",
          status: "New",
          resource: [],
        },
        {
          id: crypto.randomUUID(),
          korean: "하지만",
          english: "But (connective)",
          category: "Conjunctions",
          status: "Learning",
          resource: [],
        }
      );
    }
    this.saveData(); // Save dummy data if it was just added
    this.renderVocabularies(); // Initial render for vocabulary
    this.renderGrammars(); // Initial render for grammar
    this.renderCategories(); // Initial render for categories
    this.renderStatuses(); // Initial render for statuses
  },
};

// jQuery debounce function for search inputs
$.debounce = function (delay, fn) {
  let timeout;
  return function () {
    const context = this,
      args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
};

// Initialize the app when the document is ready
$(document).ready(() => {
  app.init();
});
