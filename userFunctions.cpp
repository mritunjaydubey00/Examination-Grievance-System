#include <iostream>
#include <string>
using namespace std;

void printLine()
{
    cout << "\n ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~" << endl;
}

class user
{
private:
    user *next;
    user *prev;
    string password, username, firstName, lastName, phoneNumber, email, gender, dateOfBirth, department, designation;

public:
    user()
    {
        printLine();
        cout << "First Name: ";
        getline(cin, firstName);
        cout << "Last Name: ";
        getline(cin, lastName);
        cout << "Username: ";
        getline(cin, username);
        cout << "Password: ";
        getline(cin, password);
        cout << "Phone Number: ";
        getline(cin, phoneNumber);
        cout << "Email: ";
        getline(cin, email);
        cout << "Gender: ";
        getline(cin, gender);
        cout << "Date of Birth: ";
        getline(cin, dateOfBirth);
        cout << "Department: ";
        getline(cin, department);
        cout << "Designation: ";
        getline(cin, designation);
        printLine();
        displayUserInfo(this);
    }

    friend void displayUserInfo(user *thisUser);
    friend int createUser();
    friend user *searchUser(string username);
    friend int Login(string username, string password);
};
user *head = nullptr;

void displayUserInfo(user *thisUser)
{
    printLine();
    cout << "First Name: " << thisUser->firstName << endl;
    cout << "Last Name: " << thisUser->lastName << endl;
    cout << "Username: " << thisUser->username << endl;
    cout << "Phone Number: " << thisUser->phoneNumber << endl;
    cout << "Email: " << thisUser->email << endl;
    cout << "Gender: " << thisUser->gender << endl;
    cout << "Date of Birth: " << thisUser->dateOfBirth << endl;
    cout << "Department: " << thisUser->department << endl;
    cout << "Designation: " << thisUser->designation << endl;
    printLine();
}

int createUser()
{
    user *newUser = new user();
    if (head == nullptr)
    {
        head = newUser;
        cout << "User created successfully!" << endl;
    }
    else
    {
        user *temp = head;
        while (temp->next != nullptr)
        {
            temp = temp->next;
        }
        temp->next = newUser;
        newUser->prev = temp;
        cout << "User created successfully!" << endl;
    }
    return 0;
}

user *searchUser(string username)
{
    user *temp = head;
    while (temp != nullptr)
    {
        if (temp->username == username)
        {
            cout << "User found!" << endl;

            return temp;
        }
        temp = temp->next;
    }
    cout << "User not found!" << endl;
    return nullptr;
}

int Login(string username, string password)
{
    user *foundUser = searchUser(username);
    if (foundUser != nullptr && foundUser->password == password)
    {
        cout << "Login successful!" << endl;
        displayUserInfo(foundUser);
        return 0;
    }
    cout << "Invalid username or password!" << endl;
    return 0;
}
