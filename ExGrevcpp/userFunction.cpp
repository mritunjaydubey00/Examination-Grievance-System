#include <iostream>
#include <string>
#include "userFunction.h"
using namespace std;

class User
{
private:
    string fname, lname, email, phoneNumber, department, position, userID, password;

public:
    friend int makeUser(User &user);
    friend int userID(User &user);
    friend int displayUserInfo(User &user);
    friend int password(User &user, int choice);
    friend int completeProfile(User &user);
};

int makeUser(User &user)
{
    cout << "Enter your first name: ";
    cin >> user.fname;
    cout << "Enter your Last name: ";
    cin >> user.lname;
    return 0;
}

int userID(User &user)
{
    cout << "Enter your new ID: ";
    cin >> user.userID;
    return 0;
}

int displayUserInfo(User &user)
{
    cout << "First Name: " << user.fname << endl;
    cout << "Last Name: " << user.lname << endl;
    cout << "Email: " << user.email << endl;
    cout << "Phone Number: " << user.phoneNumber << endl;
    cout << "Department: " << user.department << endl;
    cout << "Position: " << user.position << endl;
    return 0;
}

int password(User &user, int choice)
{
    switch (choice)
    {
    case 1:
    {
        string tempPass1, tempPass2;
        cout << "Enter Password: ";
        cin >> tempPass1;
        cout << "Confirm Password: ";
        cin >> tempPass2;
        if (tempPass1 == tempPass2)
        {
            user.password = tempPass1;
            cout << "Password set successfully!" << endl;
        }
        else
        {
            cout << "Passwords do not match. Please try again." << endl;
        }
        return 0;
    }
    case 2:
    {
        cout << "Current Password: ";
        cin >> user.password;
        cout << "Enter your new password: ";
        cin >> user.password;
        return 0;
    }
    }
}

int completeProfile(User &user)
{
    cout << "Enter your email: ";
    cin >> user.email;
    cout << "Enter your phone number: ";
    cin >> user.phoneNumber;
    cout << "Enter your department: ";
    cin >> user.department;
    cout << "Enter your position: ";
    cin >> user.position;
    return 0;
}

int makeProfile(User &user)
{
    makeUser(user);
    userID(user);
    password(user, 1);
    completeProfile(user);
    return 0;
}
