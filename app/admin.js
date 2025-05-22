// app/admin.js с улучшенной проверкой доступа
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    TextInput,
    Modal,
    Switch
} from 'react-native';
import { router } from 'expo-router';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';

export default function AdminScreen() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const { user, hasAccess } = useUser();
    const { palette, isDark } = useColors(); // Получаем цветовую палитру

    // Строгая проверка прав доступа на уровне экрана
    useEffect(() => {
        if (!user || !hasAccess(ROLES.ADMIN)) {
            Alert.alert('Доступ запрещен', 'У вас нет прав для доступа к этому экрану');
            router.replace('/employees');
            return;
        }
        
        fetchUsers();
    }, [user, hasAccess]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // В реальном приложении здесь был бы запрос к API
            // const response = await api.get('/api/users/');

            // Демо-данные для примера
            const mockUsers = [
                {
                    id: 1,
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: ROLES.ADMIN,
                    active: true
                },
                {
                    id: 2,
                    name: 'Accountant User',
                    email: 'accountant@example.com',
                    role: ROLES.ACCOUNTANT,
                    active: true
                },
                {
                    id: 3,
                    name: 'Employee User',
                    email: 'employee@example.com',
                    role: ROLES.EMPLOYEE,
                    active: true
                },
                {
                    id: 4,
                    name: 'John Smith',
                    email: 'john@example.com',
                    role: ROLES.EMPLOYEE,
                    active: false
                }
            ];

            setUsers(mockUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список пользователей');
        } finally {
            setLoading(false);
        }
    };

    // Обработчик кнопки "Add User"
    const handleAddUser = () => {
        setCurrentUser({
            id: Date.now(), // Временный ID, в реальном приложении будет заменен сервером
            name: '',
            email: '',
            role: ROLES.EMPLOYEE,
            active: true
        });
        setIsNewUser(true);
        setModalVisible(true);
    };

    const handleEditUser = (user) => {
        setCurrentUser({ ...user });
        setIsNewUser(false);
        setModalVisible(true);
    };

    const handleSaveUser = () => {
        // Проверяем обязательные поля
        if (!currentUser.name.trim() || !currentUser.email.trim()) {
            Alert.alert('Ошибка', 'Имя и Email обязательны для заполнения');
            return;
        }

        // Валидация формата email (простая проверка)
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(currentUser.email)) {
            Alert.alert('Ошибка', 'Пожалуйста, введите корректный Email');
            return;
        }

        // В реальном приложении здесь был бы API-запрос
        if (isNewUser) {
            // Для нового пользователя: POST запрос
            // await api.post('/api/users/', currentUser);

            // Добавляем пользователя в локальный список
            setUsers([...users, currentUser]);
            Alert.alert('Успех', 'Новый пользователь добавлен');
        } else {
            // Для существующего пользователя: PUT запрос
            // await api.put(`/api/users/${currentUser.id}/`, currentUser);

            // Обновляем локальные данные
            setUsers(users.map(u => u.id === currentUser.id ? currentUser : u));
            Alert.alert('Успех', 'Данные пользователя обновлены');
        }

        setModalVisible(false);
    };

    const handleRoleChange = (role) => {
        setCurrentUser({ ...currentUser, role });
    };

    const renderUserItem = ({ item }) => (
        <View style={[styles(palette, isDark).card, !item.active && styles(palette, isDark).inactiveCard]}>
            <View style={styles(palette, isDark).cardContent}>
                <View>
                    <Text style={styles(palette, isDark).userName}>{item.name}</Text>
                    <Text style={styles(palette, isDark).userEmail}>{item.email}</Text>
                    <View style={[
                        styles(palette, isDark).roleBadge,
                        item.role === ROLES.ADMIN ? styles(palette, isDark).adminBadge :
                            item.role === ROLES.ACCOUNTANT ? styles(palette, isDark).accountantBadge :
                                styles(palette, isDark).employeeBadge
                    ]}>
                        <Text style={styles(palette, isDark).roleText}>
                            {item.role === ROLES.ADMIN ? 'Admin' :
                                item.role === ROLES.ACCOUNTANT ? 'Accountant' :
                                    'Employee'}
                        </Text>
                    </View>
                </View>

                <View style={styles(palette, isDark).cardActions}>
                    {!item.active && <Text style={styles(palette, isDark).inactiveLabel}>Inactive</Text>}
                    <TouchableOpacity
                        style={styles(palette, isDark).editButton}
                        onPress={() => handleEditUser(item)}
                    >
                        <Text style={styles(palette, isDark).editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // Если пользователь не админ, возвращаем пустой компонент
    // (дополнительная защита на уровне рендеринга)
    if (!user || !hasAccess(ROLES.ADMIN)) {
        return null;
    }

    return (
        <SafeAreaView style={styles(palette, isDark).container}>
            <View style={styles(palette, isDark).header}>
                <Text style={styles(palette, isDark).title}>User Management</Text>
                <TouchableOpacity
                    style={styles(palette, isDark).addButton}
                    onPress={handleAddUser}
                >
                    <Text style={styles(palette, isDark).addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={palette.primary} style={styles(palette, isDark).loader} />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles(palette, isDark).listContent}
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles(palette, isDark).modalOverlay}>
                    <View style={styles(palette, isDark).modalContent}>
                        <Text style={styles(palette, isDark).modalTitle}>
                            {isNewUser ? 'Add User' : 'Edit User'}
                        </Text>

                        <View style={styles(palette, isDark).inputGroup}>
                            <Text style={styles(palette, isDark).inputLabel}>Имя</Text>
                            <TextInput
                                style={styles(palette, isDark).textInput}
                                value={currentUser?.name}
                                onChangeText={(text) => setCurrentUser({ ...currentUser, name: text })}
                                placeholder="Enter user's name"
                                placeholderTextColor={palette.text.secondary}
                                color={palette.text.primary}
                            />
                        </View>

                        <View style={styles(palette, isDark).inputGroup}>
                            <Text style={styles(palette, isDark).inputLabel}>Email</Text>
                            <TextInput
                                style={styles(palette, isDark).textInput}
                                value={currentUser?.email}
                                onChangeText={(text) => setCurrentUser({ ...currentUser, email: text })}
                                keyboardType="email-address"
                                placeholder="Enter email"
                                autoCapitalize="none"
                                placeholderTextColor={palette.text.secondary}
                                color={palette.text.primary}
                            />
                        </View>

                        <View style={styles(palette, isDark).inputGroup}>
                            <Text style={styles(palette, isDark).inputLabel}>Role</Text>
                            <View style={styles(palette, isDark).roleSelectors}>
                                <TouchableOpacity
                                    style={[
                                        styles(palette, isDark).roleSelector,
                                        currentUser?.role === ROLES.EMPLOYEE && styles(palette, isDark).selectedRole
                                    ]}
                                    onPress={() => handleRoleChange(ROLES.EMPLOYEE)}
                                >
                                    <Text style={styles(palette, isDark).roleSelectorText}>Employee</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles(palette, isDark).roleSelector,
                                        currentUser?.role === ROLES.ACCOUNTANT && styles(palette, isDark).selectedRole
                                    ]}
                                    onPress={() => handleRoleChange(ROLES.ACCOUNTANT)}
                                >
                                    <Text style={styles(palette, isDark).roleSelectorText}>Accountant</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles(palette, isDark).roleSelector,
                                        currentUser?.role === ROLES.ADMIN && styles(palette, isDark).selectedRole
                                    ]}
                                    onPress={() => handleRoleChange(ROLES.ADMIN)}
                                >
                                    <Text style={styles(palette, isDark).roleSelectorText}>Admin</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles(palette, isDark).inputGroup}>
                            <Text style={styles(palette, isDark).inputLabel}>Status</Text>
                            <View style={styles(palette, isDark).statusToggle}>
                                <Text style={{color: palette.text.primary}}>Inactive</Text>
                                <Switch
                                    value={currentUser?.active}
                                    onValueChange={(value) => setCurrentUser({ ...currentUser, active: value })}
                                    trackColor={{ false: palette.text.secondary, true: palette.primaryLight }}
                                    thumbColor={currentUser?.active ? palette.primary : palette.border}
                                />
                                <Text style={{color: palette.text.primary}}>Active</Text>
                            </View>
                        </View>

                        <View style={styles(palette, isDark).modalButtons}>
                            <TouchableOpacity
                                style={[styles(palette, isDark).modalButton, styles(palette, isDark).cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles(palette, isDark).cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles(palette, isDark).modalButton, styles(palette, isDark).saveButton]}
                                onPress={handleSaveUser}
                            >
                                <Text style={styles(palette, isDark).saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles(palette, isDark).footer}>
                <TouchableOpacity
                    style={styles(palette, isDark).backButton}
                    onPress={() => router.navigate('/employees')}
                >
                    <Text style={styles(palette, isDark).backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Преобразуем стили в функцию, которая принимает цветовую палитру и флаг темной темы
const styles = (palette, isDark) => StyleSheet.create({
    accountantBadge: {
        backgroundColor: isDark ? palette.primaryDark : palette.primaryLight,
    },
    addButton: {
        backgroundColor: palette.success,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    addButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    adminBadge: {
        backgroundColor: isDark ? palette.dangerLight : palette.dangerLight,
    },
    backButton: {
        alignItems: 'center',
        backgroundColor: palette.text.secondary,
        borderRadius: 4,
        padding: 12,
    },
    backButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
    },
    cancelButtonText: {
        color: palette.text.secondary,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: palette.background.primary,
        borderRadius: 8,
        elevation: 2,
        marginBottom: 16,
        padding: 16,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardActions: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    container: {
        backgroundColor: palette.background.secondary,
        flex: 1,
    },
    editButton: {
        backgroundColor: palette.primary,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    editButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    employeeBadge: {
        backgroundColor: isDark ? palette.successLight : palette.successLight,
    },
    footer: {
        backgroundColor: palette.background.primary,
        borderTopColor: palette.border,
        borderTopWidth: 1,
        padding: 16,
    },
    header: {
        alignItems: 'center',
        backgroundColor: palette.background.primary,
        borderBottomColor: palette.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    inactiveCard: {
        backgroundColor: palette.background.secondary,
        opacity: 0.7,
    },
    inactiveLabel: {
        color: palette.danger,
        fontSize: 12,
        marginBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        color: palette.text.secondary,
        fontSize: 14,
        marginBottom: 4,
    },
    listContent: {
        padding: 16,
    },
    loader: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    modalButton: {
        alignItems: 'center',
        borderRadius: 4,
        flex: 1,
        marginHorizontal: 4,
        padding: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    modalContent: {
        backgroundColor: palette.background.primary,
        borderRadius: 8,
        elevation: 5,
        padding: 20,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        width: '80%',
    },
    modalOverlay: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        flex: 1,
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: palette.text.primary,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    roleSelector: {
        alignItems: 'center',
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        flex: 1,
        marginHorizontal: 2,
        padding: 8,
    },
    roleSelectorText: {
        fontSize: 12,
        color: palette.text.primary,
    },
    roleSelectors: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    saveButton: {
        backgroundColor: palette.success,
    },
    saveButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    selectedRole: {
        backgroundColor: palette.primaryLight,
        borderColor: palette.primary,
    },
    statusToggle: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    textInput: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderRadius: 4,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    userEmail: {
        color: palette.text.secondary,
        fontSize: 14,
        marginBottom: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: palette.text.primary,
    }
});