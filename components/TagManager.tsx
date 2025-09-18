import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  CoachTag, 
  TagCreateData,
  AVAILABLE_COLORS
} from '@/models/tag';
import {
  createCoachTag,
  getCoachTags,
  deleteCoachTag,
  updateCoachTag
} from '@/services/tagService';

interface TagManagerProps {
  coachId: string;
  onTagsChange?: (tags: CoachTag[]) => void;
  editable?: boolean;
}

interface TagItemProps {
  tag: CoachTag;
  onEdit?: () => void;
  onDelete?: () => void;
  editable?: boolean;
}

const TagItem: React.FC<TagItemProps> = ({ tag, onEdit, onDelete, editable = true }) => (
  <View style={[styles.tagItem, { backgroundColor: tag.color + '20', borderColor: tag.color }]}>
    <Ionicons 
      name="pricetag-outline" 
      size={16} 
      color={tag.color} 
      style={styles.tagIcon}
    />
    <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
    {editable && (
      <View style={styles.tagActions}>
        <TouchableOpacity onPress={onEdit} style={styles.tagActionButton}>
          <Ionicons name="pencil" size={14} color={tag.color} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.tagActionButton}>
          <Ionicons name="close" size={14} color={tag.color} />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

const TagManager: React.FC<TagManagerProps> = ({ 
  coachId, 
  onTagsChange, 
  editable = true 
}) => {
  const [tags, setTags] = useState<CoachTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<CoachTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);

  useEffect(() => {
    loadTags();
  }, [coachId]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const coachTags = await getCoachTags(coachId);
      setTags(coachTags);
      onTagsChange?.(coachTags);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
      Alert.alert('Erreur', 'Impossible de charger les tags');
    } finally {
      setLoading(false);
    }
  };
  const openCreateModal = () => {
    setEditingTag(null);
    setTagName('');
    setSelectedColor(AVAILABLE_COLORS[0]);
    setModalVisible(true);
  };

  const openEditModal = (tag: CoachTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setSelectedColor(tag.color);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTag(null);
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      Alert.alert('Erreur', 'Le nom du tag est obligatoire');
      return;
    }

    try {
      if (editingTag) {
        // Modifier un tag existant
        await updateCoachTag(coachId, editingTag.id, {
          name: tagName.trim(),
          color: selectedColor
        });
      } else {
        // Créer un nouveau tag
        const tagData: TagCreateData = {
          name: tagName.trim(),
          color: selectedColor
        };
        await createCoachTag(coachId, tagData);
      }
      
      await loadTags();
      closeModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du tag:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de sauvegarder le tag');
    }
  };

  const handleDeleteTag = async (tag: CoachTag) => {
    Alert.alert(
      'Supprimer le tag',
      `Êtes-vous sûr de vouloir supprimer le tag "${tag.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCoachTag(coachId, tag.id);
              await loadTags();
            } catch (error) {
              console.error('Erreur lors de la suppression du tag:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le tag');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#7667ac" />
        <Text style={styles.loadingText}>Chargement des tags...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spécialités et Tags</Text>
        {editable && (
          <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
            <Ionicons name="add" size={20} color="#7667ac" />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      {tags.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Aucun tag ajouté</Text>
          {editable && (
            <Text style={styles.emptySubtext}>
              Ajoutez des tags pour mettre en valeur vos spécialités
            </Text>
          )}
        </View>
      ) : (        <View style={styles.tagsGrid}>
          {tags.map(tag => (
            <TagItem
              key={tag.id}
              tag={tag}
              editable={editable}
              onEdit={() => openEditModal(tag)}
              onDelete={() => handleDeleteTag(tag)}
            />
          ))}
        </View>
      )}

      {/* Modal de création/édition */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTag ? 'Modifier le tag' : 'Nouveau tag'}
            </Text>
            <TouchableOpacity onPress={handleSaveTag}>
              <Text style={styles.saveButton}>
                {editingTag ? 'Modifier' : 'Créer'}
              </Text>
            </TouchableOpacity>
          </View>          <ScrollView style={styles.modalContent}>
            {/* Saisie du nom */}
            <Text style={styles.label}>Nom du tag</Text>
            <TextInput
              style={styles.input}
              value={tagName}
              onChangeText={setTagName}
              placeholder="Entrez le nom de votre spécialité"
              autoCapitalize="words"
            />

            {/* Sélection de couleur */}
            <Text style={styles.label}>Couleur</Text>
            <View style={styles.colorsGrid}>
              {AVAILABLE_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorOption
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    marginLeft: 4,
    color: '#7667ac',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  tagIcon: {
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  tagActionButton: {
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    color: '#7667ac',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#333',
    transform: [{ scale: 1.1 }],
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },  
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
});

export { TagManager };